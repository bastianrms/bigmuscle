// pages/api/users/UserProfileHeaderQuery.ts
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

type UserRow = {
  user_id: string;
  username: string | null;
  bio: string | null;

  // ✅ fallback avatar / consistency with cards
  thumb_url: string | null;

  height_cm: number | null;
  weight_kg: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  bodyfat_percent: number | null;

  country: string | null;
  city: string | null;

  last_active_at: string | null;
};

type PhotoRow = {
  medium_url: string | null;
  // ✅ DEIN FELDNAME
  is_profilephoto?: boolean | null;
  created_at?: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function computeIsOnline(lastActiveIso: string | null, cutoffMinutes: number) {
  if (!lastActiveIso) return false;
  const ts = new Date(lastActiveIso).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= cutoffMinutes * 60 * 1000;
}

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
    const viewerId = authData.user.id;

    const cutoffMinutes = clampInt(req.query.cutoff_minutes, 1, 120, 15);

    const usernameRaw = req.query.username;
    const userIdRaw = req.query.user_id;

    const username = typeof usernameRaw === "string" ? usernameRaw.trim() : null;
    const userIdMaybe = typeof userIdRaw === "string" ? userIdRaw.trim() : null;

    const effectiveUsername = username ?? (userIdMaybe && !isUuid(userIdMaybe) ? userIdMaybe : null);
    const effectiveUserId = userIdMaybe && isUuid(userIdMaybe) ? userIdMaybe : null;

    if (!effectiveUsername && !effectiveUserId) {
      return res.status(400).json({ error: "Missing username" });
    }

    // 1) User (✅ thumb_url included)
    const userQuery = supabase
      .from("users")
      .select(
        "user_id, username, bio, thumb_url, height_cm, weight_kg, chest_cm, arms_cm, waist_cm, thigh_cm, bodyfat_percent, country, city, last_active_at"
      );

    const { data: userRow, error: userErr } = effectiveUsername
      ? await userQuery.eq("username", effectiveUsername).maybeSingle()
      : await userQuery.eq("user_id", effectiveUserId as string).maybeSingle();

    if (userErr) return res.status(500).json({ error: userErr.message });
    if (!userRow) return res.status(404).json({ error: "User not found" });

    const user = userRow as UserRow;

    const is_online = computeIsOnline(user.last_active_at ?? null, cutoffMinutes);
    const is_self = user.user_id === viewerId;

    // 2) Header image:
    //    a) try profilephoto
    //    b) fallback newest
    let photo: PhotoRow | null = null;

    const { data: profilePhotoRow, error: profilePhotoErr } = await supabase
      .from("user_photos")
      .select("medium_url, is_profilephoto, created_at")
      .eq("user_id", user.user_id)
      .eq("is_profilephoto", true)
      .limit(1)
      .maybeSingle();

    if (profilePhotoErr) return res.status(500).json({ error: profilePhotoErr.message });

    if (profilePhotoRow?.medium_url) {
      photo = profilePhotoRow as PhotoRow;
    } else {
      const { data: newestRow, error: newestErr } = await supabase
        .from("user_photos")
        .select("medium_url, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newestErr) return res.status(500).json({ error: newestErr.message });
      photo = (newestRow ?? null) as PhotoRow | null;
    }

    return res.status(200).json({
      profile: {
        user_id: user.user_id,
        username: user.username ?? null,
        is_online,
        is_self,

        bio: user.bio ?? null,
        height_cm: user.height_cm ?? null,
        weight_kg: user.weight_kg ?? null,
        chest_cm: user.chest_cm ?? null,
        arms_cm: user.arms_cm ?? null,
        waist_cm: user.waist_cm ?? null,
        thigh_cm: user.thigh_cm ?? null,
        bodyfat_percent: user.bodyfat_percent ?? null,
        country: user.country ?? null,
        city: user.city ?? null,

        // ✅ header uses medium_url from user_photos
        medium_url: photo?.medium_url ?? null,

        // ✅ avatar fallback stays users.thumb_url (cards are consistent)
        thumb_url: user.thumb_url ?? null,

        last_active_at: user.last_active_at ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}