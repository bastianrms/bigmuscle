// pages/api/photos/PhotoModalQuery.ts
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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function formatRelativeTime(dateIso: string) {
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  const diffSec = Math.round((then - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffSec / 3600);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffSec / (86400 * 30));
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffSec / (86400 * 365));
  return rtf.format(diffYear, "year");
}

type PhotoRow = {
  id: string;
  user_id: string;
  xl_url: string | null;
  created_at: string;
  caption: string | null;
  like_count: number | null; // bleibt im Typ, aber wir nutzen es nicht mehr fürs Response
};

type UserRow = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;
};

type CommentRow = {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const currentUserId = authData.user.id;

    const photoIdRaw = req.query.photo_id;
    const photo_id = typeof photoIdRaw === "string" ? photoIdRaw.trim() : null;

    if (!photo_id) return res.status(400).json({ error: "Missing photo_id" });
    if (!isUuid(photo_id)) return res.status(400).json({ error: "Invalid photo_id" });

    const limitRaw = req.query.comments_limit;
    const comments_limit = Math.max(
      1,
      Math.min(100, typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 30 : 30)
    );

    // 1) Photo
    const { data: photoRow, error: photoErr } = await supabase
      .from("user_photos")
      .select("id, user_id, xl_url, created_at, caption, like_count")
      .eq("id", photo_id)
      .maybeSingle();

    if (photoErr) return res.status(500).json({ error: photoErr.message });
    if (!photoRow) return res.status(404).json({ error: "Photo not found" });

    const photo = photoRow as PhotoRow;

    // 2) Owner (username)
    const { data: ownerRow, error: ownerErr } = await supabase
      .from("users")
      .select("user_id, username, thumb_url")
      .eq("user_id", photo.user_id)
      .maybeSingle();

    if (ownerErr) return res.status(500).json({ error: ownerErr.message });

    const owner = (ownerRow ?? null) as UserRow | null;

    // 3) liked_by_me
    const { data: likeRow, error: likeErr } = await supabase
      .from("photo_likes")
      .select("photo_id")
      .eq("photo_id", photo_id)
      .eq("user_id", currentUserId)
      .limit(1)
      .maybeSingle();

    if (likeErr) return res.status(500).json({ error: likeErr.message });

    const liked_by_me = !!likeRow;

    // 3b) like_count LIVE zählen (statt user_photos.like_count)
    const { count: likeCount, error: likeCountErr } = await supabase
      .from("photo_likes")
      .select("*", { count: "exact", head: true })
      .eq("photo_id", photo_id);

    if (likeCountErr) return res.status(500).json({ error: likeCountErr.message });

    // 4) Comments (oldest -> newest)
    const { data: commentRows, error: comErr } = await supabase
      .from("photo_comments")
      .select("id, photo_id, user_id, content, created_at")
      .eq("photo_id", photo_id)
      .order("created_at", { ascending: true })
      .limit(comments_limit);

    if (comErr) return res.status(500).json({ error: comErr.message });

    const comments = (commentRows ?? []) as CommentRow[];

    // 5) Comment-user profiles
    const commenterIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean)));
    let commenterMap = new Map<string, { username: string | null; thumb_url: string | null }>();

    if (commenterIds.length > 0) {
      const { data: commenterRows, error: commenterErr } = await supabase
        .from("users")
        .select("user_id, username, thumb_url")
        .in("user_id", commenterIds);

      if (commenterErr) return res.status(500).json({ error: commenterErr.message });

      const rows = (commenterRows ?? []) as UserRow[];
      commenterMap = new Map(
        rows.map((u) => [u.user_id, { username: u.username ?? null, thumb_url: u.thumb_url ?? null }])
      );
    }

    return res.status(200).json({
      photo: {
        id: photo.id,
        xl_url: photo.xl_url ?? null,
        created_at: photo.created_at,
        created_at_relative: formatRelativeTime(photo.created_at),
        caption: photo.caption ?? null,
        like_count: likeCount ?? 0,
        owner: {
          user_id: photo.user_id,
          username: owner?.username ?? null,
          thumb_url: owner?.thumb_url ?? null,
        },
      },
      liked_by_me,
      comments: comments.map((c) => {
        const u = commenterMap.get(c.user_id) ?? { username: null, thumb_url: null };
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          created_at_relative: formatRelativeTime(c.created_at),
          is_mine: c.user_id === currentUserId, // ✅ NEU: für Delete-UI
          user: {
            user_id: c.user_id,
            username: u.username,
            thumb_url: u.thumb_url,
          },
        };
      }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}