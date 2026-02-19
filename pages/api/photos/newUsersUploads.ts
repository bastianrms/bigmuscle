// pages/api/photos/newUsersUploads.ts
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

type Cursor = { created_at: string; id: string };

type PhotoRow = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  like_count: number | null;
  created_at: string;
};

export type PhotoCard = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  like_count: number;
  created_at: string;
};

type Mode = "new_users_7d" | "recent_users_90d" | "fallback_all_time";

type ResponseOk = {
  ok: true;
  items: PhotoCard[];
  next_cursor: Cursor | null;
  mode: Mode;
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
  return typeof r.created_at === "string" && typeof r.id === "string";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "private, max-age=60, stale-while-revalidate=300");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const limit = clampInt(req.query.limit, 1, 60, 24);
    const includeSelf = req.query.include_self === "1" || req.query.include_self === "true";

    const cutoff7dIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff90dIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Cursor optional
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
      const cId = req.query.cursor_id;
      if (typeof cTs === "string" && typeof cId === "string") {
        cursor = { created_at: cTs, id: cId };
      }
    }

    const isFirstPage = !cursor;

    const buildQuery = (opts: { userCreatedAfterIso?: string | null }) => {
      let q = supabase
        .from("user_photos")
        .select(
          "id,user_id,thumb_url,like_count,created_at,users!fk_user_photos_user_id!inner(created_at)"
        )
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);

      if (opts.userCreatedAfterIso) {
        q = q.gte("users.created_at", opts.userCreatedAfterIso);
      }

      if (!includeSelf) {
        q = q.neq("user_id", user.id);
      }

      if (cursor) {
        const orFilter = `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
        q = q.or(orFilter);
      }

      return q;
    };

    // 1) new users 7d
    let mode: Mode = "new_users_7d";
    let r = await buildQuery({ userCreatedAfterIso: cutoff7dIso });
    if (r.error) return res.status(500).json({ error: r.error.message });
    let rowsRaw = r.data;

    // 2) fallback: recent users 90d (nur first page)
    if ((rowsRaw ?? []).length === 0 && isFirstPage) {
      mode = "recent_users_90d";
      r = await buildQuery({ userCreatedAfterIso: cutoff90dIso });
      if (r.error) return res.status(500).json({ error: r.error.message });
      rowsRaw = r.data;
    }

    // 3) fallback: all time (nur first page)
    if ((rowsRaw ?? []).length === 0 && isFirstPage) {
      mode = "fallback_all_time";
      r = await buildQuery({ userCreatedAfterIso: null });
      if (r.error) return res.status(500).json({ error: r.error.message });
      rowsRaw = r.data;
    }

    const rows = (rowsRaw ?? []) as (PhotoRow & { users?: unknown })[];
    if (rows.length === 0) {
      return res.status(200).json({ ok: true, items: [], next_cursor: null, mode });
    }

    const items: PhotoCard[] = rows.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      thumb_url: p.thumb_url ?? null,
      like_count: typeof p.like_count === "number" ? p.like_count : 0,
      created_at: p.created_at,
    }));

    const last = rows[rows.length - 1]!;
    const next_cursor: Cursor | null =
      last?.created_at && last?.id ? { created_at: last.created_at, id: last.id } : null;

    return res.status(200).json({ ok: true, items, next_cursor, mode });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}