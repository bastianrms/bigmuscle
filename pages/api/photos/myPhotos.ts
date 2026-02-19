// pages/api/photos/myPhotos.ts
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

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

type PhotoRow = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  visibility: string;
  created_at: string;
};

export type ManagePhoto = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  visibility: "public" | "private";
  created_at: string;
};

type ResponseOk = { ok: true; items: ManagePhoto[] };
type ResponseErr = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Private user data -> lieber nicht cachen
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

    const limit = clampInt(req.query.limit, 1, 500, 200);

    const { data, error } = await supabase
      .from("user_photos")
      .select("id,user_id,thumb_url,visibility,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    const rows = (data ?? []) as PhotoRow[];

    const items: ManagePhoto[] = rows.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      thumb_url: p.thumb_url ?? null,
      visibility: p.visibility === "public" ? "public" : "private",
      created_at: p.created_at,
    }));

    return res.status(200).json({ ok: true, items });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}