// pages/api/users/UserProfilePhotosGridQuery.ts
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
          return Object.entries(parse(req.headers.cookie || "")).map(
            ([name, value]) => ({ name, value })
          );
        },
        setAll(cookies: CookieToSet[]) {
          cookies.forEach(({ name, value, options }) => {
            res.setHeader(
              "Set-Cookie",
              serialize(name, value, { ...options, path: "/" })
            );
          });
        },
      },
    }
  );
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type UserRow = {
  user_id: string;
  username: string | null;
};

type PhotoRow = {
  id: string;
  thumb_url: string | null;
  like_count: number | null;
  created_at: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    // Optional: wenn Profile öffentlich sein sollen, kannst du diesen Auth-Check entfernen.
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const usernameRaw = req.query.username;
    const userIdRaw = req.query.user_id;

    const username =
      typeof usernameRaw === "string" ? usernameRaw.trim() : null;

    const userIdMaybe =
      typeof userIdRaw === "string" ? userIdRaw.trim() : null;

    // Fallback: wenn client noch ?user_id=xyz schickt und es kein UUID ist -> als username behandeln
    const effectiveUsername =
      username ?? (userIdMaybe && !isUuid(userIdMaybe) ? userIdMaybe : null);

    const effectiveUserId =
      userIdMaybe && isUuid(userIdMaybe) ? userIdMaybe : null;

    if (!effectiveUsername && !effectiveUserId) {
      return res.status(400).json({ error: "Missing username" });
    }

    const limitRaw = req.query.limit;
    const limit = Math.max(
      1,
      Math.min(200, typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 60 : 60)
    );

    // 1) user_id via username holen (oder direkt per user_id)
    const userQuery = supabase.from("users").select("user_id, username");

    const { data: userRow, error: userErr } = effectiveUsername
      ? await userQuery.eq("username", effectiveUsername).maybeSingle()
      : await userQuery.eq("user_id", effectiveUserId as string).maybeSingle();

    if (userErr) return res.status(500).json({ error: userErr.message });
    if (!userRow) return res.status(404).json({ error: "User not found" });

    const user = userRow as UserRow;

    // 2) Photos holen (newest first)
    // Hinweis: Falls deine Spalte nicht created_at heißt, ändere .order(...)
    const { data: photoRows, error: photoErr } = await supabase
      .from("user_photos")
      .select("id, thumb_url, like_count, created_at")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (photoErr) return res.status(500).json({ error: photoErr.message });

    const items = ((photoRows ?? []) as PhotoRow[]).map((p) => ({
      id: p.id,
      thumb_url: p.thumb_url ?? null,
      like_count: p.like_count ?? 0,
      created_at: p.created_at ?? null,
    }));

    return res.status(200).json({
      user: { user_id: user.user_id, username: user.username ?? null },
      items,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}