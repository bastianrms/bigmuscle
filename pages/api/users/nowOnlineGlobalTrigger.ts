// pages/api/users/nowOnlineGlobalTrigger.ts
//
// Presence Ping Endpoint
// - Wird periodisch vom Client aufgerufen.
// - Updated users.last_active_at auf "jetzt".
// - "Now Online" ergibt sich dann über: last_active_at >= now - cutoffMinutes.

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

type PingResponse = { ok: true; last_active_at: string } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PingResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (authErr || !userId) return res.status(401).json({ error: "Not authenticated" });

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("users")
      .update({ last_active_at: nowIso })
      .eq("user_id", userId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, last_active_at: nowIso });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}