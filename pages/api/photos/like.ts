// pages/api/photos/like.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<typeof serialize>[2];
};

function makeCookieBridge(req: NextApiRequest, res: NextApiResponse) {
  return {
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
  };
}

function getSupabaseAnon(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: makeCookieBridge(req, res) }
  );
}

function getSupabaseAdmin(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var");

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: makeCookieBridge(req, res),
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Body = { photo_id?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  try {
    // 1) Auth check
    const supabaseAnon = getSupabaseAnon(req, res);
    const { data: authData, error: authErr } = await supabaseAnon.auth.getUser();
    const userId = authData?.user?.id;
    if (authErr || !userId) return res.status(401).json({ error: "Not authenticated" });

    // 2) Input
    const { photo_id } = (req.body ?? {}) as Body;
    const pid = typeof photo_id === "string" ? photo_id.trim() : "";
    if (!pid) return res.status(400).json({ error: "photo_id is required" });
    if (!isUuid(pid)) return res.status(400).json({ error: "Invalid photo_id" });

    // 3) Admin client
    const supabaseAdmin = getSupabaseAdmin(req, res);

    // 4) Toggle: exists?
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("photo_likes")
      .select("photo_id")
      .eq("photo_id", pid)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existErr) return res.status(500).json({ error: existErr.message });

    let liked_by_me: boolean;

    if (existing) {
      // Unlike
      const { error: delErr } = await supabaseAdmin
        .from("photo_likes")
        .delete()
        .eq("photo_id", pid)
        .eq("user_id", userId);

      if (delErr) return res.status(500).json({ error: delErr.message });
      liked_by_me = false;
    } else {
      // Like
      const { error: insErr } = await supabaseAdmin
        .from("photo_likes")
        .insert({ photo_id: pid, user_id: userId });

      // Double-click / race: Duplicate => treat as liked
      if (insErr) {
        const msg = (insErr.message || "").toLowerCase();
        if (!msg.includes("duplicate")) {
          return res.status(500).json({ error: insErr.message });
        }
      }
      liked_by_me = true;
    }

    // 5) Count ALL likes
    const { count, error: countErr } = await supabaseAdmin
      .from("photo_likes")
      .select("*", { count: "exact", head: true })
      .eq("photo_id", pid);

    if (countErr) return res.status(500).json({ error: countErr.message });
    const like_count = count ?? 0;

    // 6) Persist count
    const { error: updErr } = await supabaseAdmin
      .from("user_photos")
      .update({ like_count })
      .eq("id", pid);

    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.status(200).json({
      ok: true,
      photo_id: pid,
      liked_by_me,
      like_count,
    });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}