// pages/api/photos/newUploads.ts
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

type Cursor = {
  created_at: string;
  id: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  like_count: number | null;
  created_at: string;
};

type UserRow = {
  user_id: string;
  username: string | null;
};

export type PhotoCard = {
  id: string;
  user_id: string;
  username: string | null;
  thumb_url: string | null;
  like_count: number;
  created_at: string;
};

type ResponseOk = {
  ok: true;
  items: PhotoCard[];
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

  // New uploads: kurz cachen ist ok (Client lädt eh weiter bei Scroll).
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

    // Cursor optional: ?cursor=<json> oder getrennt
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

    let q = supabase
      .from("user_photos")
      .select("id,user_id,thumb_url,like_count,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (!includeSelf) {
      q = q.neq("user_id", user.id);
    }

    // Keyset Pagination für DESC order:
    // (created_at, id) < (cursor.created_at, cursor.id)
    if (cursor) {
      const orFilter = `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
      q = q.or(orFilter);
    }

    const { data: photoRowsRaw, error: photosErr } = await q;
    if (photosErr) return res.status(500).json({ error: photosErr.message });

    const photoRows = (photoRowsRaw ?? []) as PhotoRow[];
    if (photoRows.length === 0) {
      return res.status(200).json({ ok: true, items: [], next_cursor: null });
    }

    // usernames holen (damit du in Cards verlinken kannst)
    const userIds = Array.from(new Set(photoRows.map((p) => p.user_id)));
    const { data: userRowsRaw, error: usersErr } = await supabase
      .from("users")
      .select("user_id,username")
      .in("user_id", userIds);

    if (usersErr) return res.status(500).json({ error: usersErr.message });

    const userRows = (userRowsRaw ?? []) as UserRow[];
    const usernameById = new Map<string, string | null>();
    for (const u of userRows) usernameById.set(u.user_id, u.username ?? null);

    const items: PhotoCard[] = photoRows.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      username: usernameById.get(p.user_id) ?? null,
      thumb_url: p.thumb_url ?? null,
      like_count: typeof p.like_count === "number" ? p.like_count : 0,
      created_at: p.created_at,
    }));

const last = photoRows[photoRows.length - 1]!;
const next_cursor: Cursor | null =
  last?.created_at && last?.id ? { created_at: last.created_at, id: last.id } : null;

return res.status(200).json({ ok: true, items, next_cursor });

  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}