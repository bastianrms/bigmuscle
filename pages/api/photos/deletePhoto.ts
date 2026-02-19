// pages/api/photos/deletePhoto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { deleteManyFromR2, r2KeyFromPublicUrl } from "@/lib/r2";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<typeof serialize>[2];
};

function getSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(parse(req.headers.cookie || "")).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies: CookieToSet[]) {
          cookies.forEach(({ name, value, options }) => {
            res.setHeader("Set-Cookie", serialize(name, value, { ...options, path: "/" }));
          });
        },
      },
    }
  );
}

type Body = { id?: string };

type PhotoRow = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  medium_url: string | null;
  xl_url: string | null;
};

type ResponseOk = {
  ok: true;
  id: string;
  deleted_keys: string[];
};

type ResponseErr = { error: string };

function safeJsonParse<T>(v: unknown): T | null {
  if (typeof v !== "string") return (v as T) ?? null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Private user action -> no cache
  res.setHeader("Cache-Control", "private, no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const body = safeJsonParse<Body>(req.body) ?? {};
    const photoId = body?.id?.trim();

    if (!photoId) {
      return res.status(400).json({ error: "Missing id" });
    }

    // 1) Fetch row (verify ownership + get URLs)
    const { data: row, error: selErr } = await supabase
      .from("user_photos")
      .select("id,user_id,thumb_url,medium_url,xl_url")
      .eq("id", photoId)
      .single();

    if (selErr) return res.status(500).json({ error: selErr.message });

    const photo = row as PhotoRow | null;
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    if (photo.user_id !== user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // 2) Collect keys from URLs
    const urls = [photo.thumb_url, photo.medium_url, photo.xl_url].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    const keys = Array.from(
      new Set(urls.map((u) => r2KeyFromPublicUrl(u)).filter((k): k is string => !!k))
    );

    // 3) Delete DB row first (source of truth)
    // (Deine photo_likes/photo_comments werden via FK ON DELETE CASCADE gelöscht)
    const { error: delErr } = await supabase
      .from("user_photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id);

    if (delErr) return res.status(500).json({ error: delErr.message });

    // 4) Delete R2 objects (best effort)
    if (keys.length > 0) {
      try {
        await deleteManyFromR2(keys);
      } catch (e) {
        console.error("[deletePhoto] R2 delete failed", e);
        // DB ist schon weg -> wir lassen es nicht failen
      }
    }

    return res.status(200).json({ ok: true, id: photoId, deleted_keys: keys });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}