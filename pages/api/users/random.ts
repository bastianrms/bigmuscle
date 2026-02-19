// pages/api/users/dailyRandom.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { createHash } from "crypto";

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

type ResponseOk = { ok: true; items: UserCard[] };
type ResponseErr = { error: string };

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function getBerlinDayKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD
}

function pivotUuidFromSeed(seed: string): string {
  const hex = createHash("md5").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function secondsUntilBerlinMidnight(now = new Date()): number {
  // Pragmatistisch + robust: wir rechnen alles in "Berlin local time"
  const berlinNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));

  const start = new Date(berlinNow);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const ttl = Math.floor((end.getTime() - berlinNow.getTime()) / 1000);
  return Math.max(60, Math.min(ttl, 24 * 60 * 60)); // mindestens 60s
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dayKey = getBerlinDayKey();
  const limit = clampInt(req.query.limit, 1, 50, 50);
  const includeSelf = req.query.include_self === "1" || req.query.include_self === "true";

  // ✅ ETag pro Tag + limit (+ includeSelf)
  const etag = `"daily-random-${dayKey}-${limit}-${includeSelf ? "with-self" : "no-self"}"`;
  res.setHeader("ETag", etag);

  // ✅ bis Mitternacht Berlin cachen
  const ttl = secondsUntilBerlinMidnight();
  res.setHeader("Cache-Control", `private, max-age=${ttl}, stale-while-revalidate=3600`);
  res.setHeader("Vary", "Cookie");

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const viewerId = authData?.user?.id;
    if (authErr || !viewerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data: viewerRow, error: viewerErr } = await supabase
      .from("users")
      .select("unit_system")
      .eq("user_id", viewerId)
      .maybeSingle();

    if (viewerErr) return res.status(500).json({ error: viewerErr.message });

    const viewerUnit: UnitSystem = normalizeUnitSystem(viewerRow?.unit_system);

    const pivot = pivotUuidFromSeed(`daily-random-users:${dayKey}`);
    const selectCols = "user_id,username,thumb_url,country,city,height_cm,weight_kg";

    let q1 = supabase
      .from("users")
      .select(selectCols)
      .gte("user_id", pivot)
      .order("user_id", { ascending: true })
      .limit(limit);

    if (!includeSelf) q1 = q1.neq("user_id", viewerId);

    const { data: rows1, error: err1 } = await q1;
    if (err1) return res.status(500).json({ error: err1.message });

    const got1 = ((rows1 ?? []) as UserRowForCard[]) ?? [];
    const missing = Math.max(0, limit - got1.length);

    let gotAll = got1;

    if (missing > 0) {
      let q2 = supabase
        .from("users")
        .select(selectCols)
        .lt("user_id", pivot)
        .order("user_id", { ascending: true })
        .limit(missing);

      if (!includeSelf) q2 = q2.neq("user_id", viewerId);

      const { data: rows2, error: err2 } = await q2;
      if (err2) return res.status(500).json({ error: err2.message });

      gotAll = got1.concat((((rows2 ?? []) as UserRowForCard[]) ?? []));
    }

    const items: UserCard[] = gotAll.map((r) => mapUserRowToUserCard(r, viewerUnit));

    return res.status(200).json({ ok: true, items });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}