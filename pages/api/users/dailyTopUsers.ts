// pages/api/users/dailyTopUsers.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

import type { UnitSystem, UserCard, UserRowForCard } from "@/lib/user/cards";
import { mapUserRowToUserCard, normalizeUnitSystem } from "@/lib/user/cards";

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

type Source = "daily" | "all_time";

type MVRow = {
  day: string; // YYYY-MM-DD
  rank: number;
  user_id: string;
  likes_count: number;
  source: Source | string;
};

export type DailyTopUserItem = UserCard & {
  day: string;
  rank: number;
  likes_count: number;
  source: Source;
};

type ResponseOk = { ok: true; items: DailyTopUserItem[]; day: string; mode: Source };
type ResponseErr = { error: string };

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asSource(v: unknown): Source {
  return v === "all_time" ? "all_time" : "daily";
}

function asUnitSystemFromQuery(v: unknown): UnitSystem | null {
  return v === "metric" || v === "imperial" ? v : null;
}

async function getLatestDay(
  supabase: ReturnType<typeof getSupabaseServerClient>
): Promise<string | null> {
  const { data, error } = await supabase
    .from("daily_top_users_mv")
    .select("day")
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const day = (data as { day?: string | null } | null)?.day ?? null;
  return day;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // MV wird 1×/Tag refreshed -> Cache kann ruhig höher sein.
  // Wenn du absolut "einmal täglich" willst: max-age=86400
  res.setHeader("Cache-Control", "private, max-age=3600, stale-while-revalidate=86400");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) return res.status(401).json({ error: "Not authenticated" });

    const limit = clampInt(req.query.limit, 1, 50, 10);

    // Viewer Unit: bevorzugt Query Param (verhindert Flicker)
    let viewerUnit: UnitSystem | null = asUnitSystemFromQuery(req.query.unit_system);

    if (!viewerUnit) {
      const { data: viewerRow, error: viewerErr } = await supabase
        .from("users")
        .select("unit_system")
        .eq("user_id", user.id)
        .maybeSingle();

      if (viewerErr) return res.status(500).json({ error: viewerErr.message });
      viewerUnit = normalizeUnitSystem(viewerRow?.unit_system);
    }

    // Day: ?day=YYYY-MM-DD oder latest aus MV
    const dayParam = typeof req.query.day === "string" ? req.query.day.trim() : "";
    const day = dayParam || (await getLatestDay(supabase));
    if (!day) return res.status(404).json({ error: "No snapshot found" });

    // Rows aus MV (pro day bereits rank<=10, aber limit ist flexibel)
    const { data: mvRaw, error: mvErr } = await supabase
      .from("daily_top_users_mv")
      .select("day,rank,user_id,likes_count,source")
      .eq("day", day)
      .order("rank", { ascending: true })
      .limit(limit);

    if (mvErr) return res.status(500).json({ error: mvErr.message });

    const picked = (mvRaw ?? []) as MVRow[];
    const ids = picked.map((r) => r.user_id).filter(Boolean);

    if (ids.length === 0) {
      return res.status(200).json({ ok: true, items: [], day, mode: "all_time" });
    }

    // User rows für cards
    const selectCols = "user_id,username,thumb_url,country,city,height_cm,weight_kg";
    const { data: userRowsRaw, error: usersErr } = await supabase
      .from("users")
      .select(selectCols)
      .in("user_id", ids);

    if (usersErr) return res.status(500).json({ error: usersErr.message });

    const byId = new Map<string, UserRowForCard>();
    for (const u of (userRowsRaw ?? []) as UserRowForCard[]) byId.set(u.user_id, u);

    const items: DailyTopUserItem[] = picked
      .map((r) => {
        const u = byId.get(r.user_id);
        if (!u) return null;

        const card = mapUserRowToUserCard(u, viewerUnit!);

        return {
          ...card,
          day: r.day,
          rank: r.rank,
          likes_count: typeof r.likes_count === "number" ? r.likes_count : 0,
          source: asSource(r.source),
        };
      })
      .filter((x): x is DailyTopUserItem => x !== null);

    const mode: Source = items.some((x) => x.source === "daily") ? "daily" : "all_time";

    return res.status(200).json({ ok: true, items, day, mode });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}