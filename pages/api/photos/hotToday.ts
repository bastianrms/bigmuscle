// pages/api/photos/hotToday.ts
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
  likes_count: number;
  photo_id: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  created_at: string;
  like_count: number | null; // all_time fallback
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

function firstQueryVal(v: unknown): unknown {
  return Array.isArray(v) ? v[0] : v;
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const vv = firstQueryVal(v);
  const n = typeof vv === "string" ? parseInt(vv, 10) : Number(vv);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isCursorLike(v: unknown): v is Cursor {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.likes_count === "number" && typeof r.photo_id === "string";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Hot Today: kurze Cache-Zeit ist ok
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
    const includeSelf = firstQueryVal(req.query.include_self) === "1" || firstQueryVal(req.query.include_self) === "true";

    // Cursor: entweder JSON (?cursor=...) oder getrennte Params
    let cursor: Cursor | null = null;
    const cursorRaw = firstQueryVal(req.query.cursor);
    if (typeof cursorRaw === "string" && cursorRaw.trim()) {
      try {
        const parsed = JSON.parse(cursorRaw) as unknown;
        if (isCursorLike(parsed)) cursor = parsed;
      } catch {
        // ignore
      }
    } else {
      const cLikes = firstQueryVal(req.query.cursor_likes_count);
      const cPid = firstQueryVal(req.query.cursor_photo_id);
      const likesNum = typeof cLikes === "string" ? parseInt(cLikes, 10) : Number(cLikes);
      if (Number.isFinite(likesNum) && typeof cPid === "string" && cPid) {
        cursor = { likes_count: Math.trunc(likesNum), photo_id: cPid };
      }
    }

    // 1) DAILY HOT via RPC
    const { data: hotRowsRaw, error: hotErr } = await supabase.rpc("hot_photos_today", {
      p_limit: limit,
      p_cursor_likes: cursor?.likes_count ?? null,
      p_cursor_photo_id: cursor?.photo_id ?? null,
    });

    if (hotErr) return res.status(500).json({ error: hotErr.message });

    const hotRows = (hotRowsRaw ?? []) as { photo_id: string; likes_count: number }[];

    // optional: self rausfiltern (wenn du eigene Fotos nicht willst)
    const hotPhotoIds = hotRows.map((r) => r.photo_id);

    // 2) Foto-Daten für die daily IDs holen
    const photoSelect = "id,user_id,thumb_url,created_at,like_count";
    let dailyPhotos: PhotoRow[] = [];

    if (hotPhotoIds.length > 0) {
      const { data: photoRowsRaw, error: photosErr } = await supabase
        .from("user_photos")
        .select(photoSelect)
        .in("id", hotPhotoIds);

      if (photosErr) return res.status(500).json({ error: photosErr.message });
      dailyPhotos = (photoRowsRaw ?? []) as PhotoRow[];
    }

    const photoById = new Map<string, PhotoRow>();
    for (const p of dailyPhotos) photoById.set(p.id, p);

    // daily in RPC-Reihenfolge bauen
    const picked: { photo: PhotoRow; likesToday: number }[] = [];
    const pickedIds = new Set<string>();

    for (const r of hotRows) {
      const p = photoById.get(r.photo_id);
      if (!p) continue;
      if (!includeSelf && p.user_id === user.id) continue;
      if (pickedIds.has(p.id)) continue;
      picked.push({ photo: p, likesToday: r.likes_count ?? 0 });
      pickedIds.add(p.id);
      if (picked.length >= limit) break;
    }

    // 3) FALLBACK (einmalig): wenn heute zu wenig, auffüllen mit all_time like_count aus user_photos
    const missing = Math.max(0, limit - picked.length);
    const fallbackPhotos: PhotoRow[] = [];

    if (missing > 0) {
      let q = supabase
        .from("user_photos")
        .select(photoSelect)
        .order("like_count", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(200);

      if (!includeSelf) q = q.neq("user_id", user.id);

      const { data: fbRaw, error: fbErr } = await q;
      if (fbErr) return res.status(500).json({ error: fbErr.message });

      const pool = (fbRaw ?? []) as PhotoRow[];
      for (const p of pool) {
        if (pickedIds.has(p.id)) continue;
        fallbackPhotos.push(p);
        pickedIds.add(p.id);
        if (fallbackPhotos.length >= missing) break;
      }
    }

    // usernames holen (für alle finalen fotos)
    const finalPhotos = picked.map((x) => x.photo).concat(fallbackPhotos);
    if (finalPhotos.length === 0) {
      return res.status(200).json({ ok: true, items: [], next_cursor: null });
    }

    const userIds = Array.from(new Set(finalPhotos.map((p) => p.user_id)));
    const { data: userRowsRaw, error: usersErr } = await supabase
      .from("users")
      .select("user_id,username")
      .in("user_id", userIds);

    if (usersErr) return res.status(500).json({ error: usersErr.message });

    const usernameById = new Map<string, string | null>();
    for (const u of (userRowsRaw ?? []) as UserRow[]) {
      usernameById.set(u.user_id, u.username ?? null);
    }

    // Items: daily nutzt likesToday, fallback nutzt all_time like_count
    const items: PhotoCard[] = [
      ...picked.map(({ photo, likesToday }) => ({
        id: photo.id,
        user_id: photo.user_id,
        username: usernameById.get(photo.user_id) ?? null,
        thumb_url: photo.thumb_url ?? null,
        like_count: likesToday,
        created_at: photo.created_at,
      })),
      ...fallbackPhotos.map((photo) => ({
        id: photo.id,
        user_id: photo.user_id,
        username: usernameById.get(photo.user_id) ?? null,
        thumb_url: photo.thumb_url ?? null,
        like_count: typeof photo.like_count === "number" ? photo.like_count : 0,
        created_at: photo.created_at,
      })),
    ];

    // next_cursor: nur sinnvoll, wenn wir rein “daily” paginieren.
    // Wenn fallback aktiv war -> stop (next_cursor = null), weil sonst Misch-Pagination messy wird.
    const usedFallback = missing > 0;
    let next_cursor: Cursor | null = null;

    if (!usedFallback && hotRows.length > 0 && picked.length === limit) {
      const lastHot = hotRows[Math.min(hotRows.length, picked.length) - 1];
      if (lastHot?.photo_id && typeof lastHot.likes_count === "number") {
        next_cursor = { likes_count: lastHot.likes_count, photo_id: lastHot.photo_id };
      }
    }

    return res.status(200).json({ ok: true, items, next_cursor });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}