// pages/api/users/nowOnline.ts
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

type Cursor = {
  last_active_at: string;
  user_id: string;
};

type ResponseOk = {
  ok: true;
  items: UserCard[];
  next_cursor: Cursor | null;
};

type ResponseErr = { error: string };

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isCursorLike(v: unknown): v is Cursor {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.last_active_at === "string" && typeof r.user_id === "string";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ Micro-cache (pro User/Session) – spart DB Reads, bleibt trotzdem “fresh”
  res.setHeader("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
  res.setHeader("Vary", "Cookie, Accept-Encoding");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const limit = clampInt(req.query.limit, 1, 60, 6);
    const includeSelf = req.query.include_self === "1" || req.query.include_self === "true";

    const cutoffMinutes = clampInt(req.query.cutoff_minutes, 1, 120, 15);
    const cutoffIso = new Date(Date.now() - cutoffMinutes * 60 * 1000).toISOString();

    // ✅ NEW: unit_system aus Query nehmen (spart Extra-Query)
    const unitFromQuery =
      typeof req.query.unit_system === "string" ? req.query.unit_system : undefined;

    let viewerUnit: UnitSystem = normalizeUnitSystem(unitFromQuery);

    // Backwards compatible: falls unit_system NICHT mitgeschickt wird -> wie bisher DB lesen
    if (!unitFromQuery) {
      const { data: viewerRow, error: viewerErr } = await supabase
        .from("users")
        .select("unit_system")
        .eq("user_id", user.id)
        .maybeSingle();

      if (viewerErr) return res.status(500).json({ error: viewerErr.message });
      viewerUnit = normalizeUnitSystem(viewerRow?.unit_system);
    }

    let cursor: Cursor | null = null;
    const cursorRaw = req.query.cursor;

    if (typeof cursorRaw === "string" && cursorRaw.trim()) {
      try {
        const parsed = JSON.parse(cursorRaw) as unknown;
        if (isCursorLike(parsed)) cursor = parsed;
      } catch {
        // ignore
      }
    } else {
      const cTs = req.query.cursor_last_active_at;
      const cId = req.query.cursor_user_id;
      if (typeof cTs === "string" && typeof cId === "string") {
        cursor = { last_active_at: cTs, user_id: cId };
      }
    }

    let q = supabase
      .from("users")
      .select("user_id,username,thumb_url,country,city,height_cm,weight_kg,last_active_at")
      .gte("last_active_at", cutoffIso)
      .order("last_active_at", { ascending: false })
      .order("user_id", { ascending: false })
      .limit(limit);

    if (!includeSelf) q = q.neq("user_id", user.id);

    if (cursor) {
      const orFilter = `last_active_at.lt.${cursor.last_active_at},and(last_active_at.eq.${cursor.last_active_at},user_id.lt.${cursor.user_id})`;
      q = q.or(orFilter);
    }

    const { data: rows, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const safeRows = (rows ?? []) as UserRowForCard[];
    const items: UserCard[] = safeRows.map((r) => mapUserRowToUserCard(r, viewerUnit));

    const last = rows?.[rows.length - 1] as
      | { last_active_at?: string | null; user_id?: string }
      | undefined;

    const next_cursor =
      last?.last_active_at && last.user_id
        ? { last_active_at: last.last_active_at, user_id: last.user_id }
        : null;

    return res.status(200).json({ ok: true, items, next_cursor });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}