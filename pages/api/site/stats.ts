// pages/api/site/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SiteStatsRow = {
  id: number | string;
  total_users: number | null;
  total_weight_kg: number | null;
  newest_username: string | null;
  newest_created_at: string | null;
  newest_thumb_url: string | null;
};

type ResponseOk = {
  ok: true;
  stats: {
    total_users: number;
    total_weight_kg: number;
    newest: {
      username: string | null;
      created_at: string | null;
      thumb_url: string | null;
    };
  };
};

type ResponseErr = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ Best practice: CDN/Edge caching (Vercel/Cloudflare)
  // - 60s fresh
  // - up to 5min stale while revalidating
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server misconfigured: supabaseAdmin missing" });
    }

    const { data: row, error: statsErr } = await supabaseAdmin
      .from("site_stats")
      .select("id,total_users,total_weight_kg,newest_username,newest_created_at,newest_thumb_url")
      .limit(1)
      .maybeSingle();

    if (statsErr) return res.status(500).json({ error: statsErr.message });

    const stats = (row ?? null) as SiteStatsRow | null;

    return res.status(200).json({
      ok: true,
      stats: {
        total_users: typeof stats?.total_users === "number" ? stats.total_users : 0,
        total_weight_kg: typeof stats?.total_weight_kg === "number" ? stats.total_weight_kg : 0,
        newest: {
          username: stats?.newest_username ?? null,
          created_at: stats?.newest_created_at ?? null,
          thumb_url: stats?.newest_thumb_url ?? null,
        },
      },
    });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}