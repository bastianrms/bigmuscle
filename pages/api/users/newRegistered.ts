// pages/api/users/newRegistered.ts
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
  created_at: string;
  user_id: string;
};

type NewRegisteredItem = UserCard & {
  created_at: string | null;
};

type ResponseOk = {
  ok: true;
  items: NewRegisteredItem[];
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
  return typeof r.created_at === "string" && typeof r.user_id === "string";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ New users: 5 min cache
  res.setHeader("Cache-Control", "private, max-age=300, stale-while-revalidate=600");

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

    const { data: viewerRow, error: viewerErr } = await supabase
      .from("users")
      .select("unit_system")
      .eq("user_id", user.id)
      .maybeSingle();

    if (viewerErr) return res.status(500).json({ error: viewerErr.message });

    const viewerUnit: UnitSystem = normalizeUnitSystem(viewerRow?.unit_system);

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
      const cTs = req.query.cursor_created_at;
      const cId = req.query.cursor_user_id;
      if (typeof cTs === "string" && typeof cId === "string") {
        cursor = { created_at: cTs, user_id: cId };
      }
    }

    let q = supabase
      .from("users")
      .select("user_id,username,thumb_url,country,city,height_cm,weight_kg,created_at")
      .order("created_at", { ascending: false })
      .order("user_id", { ascending: false })
      .limit(limit);

    if (!includeSelf) q = q.neq("user_id", user.id);

    if (cursor) {
      const orFilter = `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},user_id.lt.${cursor.user_id})`;
      q = q.or(orFilter);
    }

    const { data: rows, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const safeRows = (rows ?? []) as (UserRowForCard & { created_at: string | null })[];

    const items: NewRegisteredItem[] = safeRows.map((r) => {
      const card = mapUserRowToUserCard(r, viewerUnit);
      return { ...card, created_at: r.created_at ?? null };
    });

    const lastRow = safeRows[safeRows.length - 1] ?? null;
    const next_cursor =
      lastRow?.created_at && lastRow.user_id
        ? { created_at: lastRow.created_at, user_id: lastRow.user_id }
        : null;

    return res.status(200).json({ ok: true, items, next_cursor });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}