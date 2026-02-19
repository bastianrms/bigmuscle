// pages/api/photos/deleteComment.ts
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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Body = { comment_id?: string; commentId?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const raw = req.body;
    const body: Body =
      typeof raw === "string" ? (JSON.parse(raw) as Body) : ((raw ?? {}) as Body);

    const cid = String(body.comment_id ?? body.commentId ?? "").trim();
    if (!cid) return res.status(400).json({ error: "comment_id is required" });
    if (!isUuid(cid)) return res.status(400).json({ error: "Invalid comment_id" });

    const { error: delErr } = await supabase
      .from("photo_comments")
      .delete()
      .eq("id", cid)
      .eq("user_id", user.id); // ✅ schützt: nur eigene Kommentare

    if (delErr) return res.status(500).json({ error: delErr.message });

    return res.status(200).json({ ok: true, comment_id: cid });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}