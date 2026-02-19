// pages/api/photos/setProfilePhoto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

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
type ResponseOk = { ok: true; id: string };
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

    // ✅ Atomic server-side switch (no unique violation)
    const { error } = await supabase.rpc("set_profile_photo", { p_photo_id: photoId });

    if (error) {
      // Wenn du hier "not allowed" siehst, dann gehört das Foto nicht dem User
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, id: photoId });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}