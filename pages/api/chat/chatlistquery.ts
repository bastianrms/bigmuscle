// pages/api/chat/chatlistquery.ts
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

type ChatListItem = {
  conversation_id: string;
  other_user_id: string;
  username: string | null;
  thumb_url: string | null;
  last_message_created_at: string | null;
  has_unread: boolean;
  is_self: boolean; // ✅ neu
};

type ChatUserRow = {
  id: string;
  user_low: string;
  user_high: string;
  last_message_created_at: string | null;
  last_read_at_low: string | null;
  last_read_at_high: string | null;
};

type UserRow = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;
};

function isAfter(a: string | null, b: string | null) {
  if (!a) return false;
  if (!b) return true; // nie gelesen -> unread
  return new Date(a).getTime() > new Date(b).getTime();
}

function isNonNull<T>(v: T | null): v is T {
  return v !== null;
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

    const currentUserId = authData.user.id;

    // 1) Alle Konversationen
    const { data: convRows, error: convErr } = await supabase
      .from("chat_users")
      .select(
        "id, user_low, user_high, last_message_created_at, last_read_at_low, last_read_at_high"
      )
      .or(`user_low.eq.${currentUserId},user_high.eq.${currentUserId}`)
      .order("last_message_created_at", { ascending: false, nullsFirst: false });

    if (convErr) return res.status(500).json({ error: convErr.message });

    // ✅ Robust: echte Self-Conversations (user_low === user_high) raus
    const conversations: ChatUserRow[] = ((convRows ?? []) as ChatUserRow[]).filter(
      (c) => c.user_low !== c.user_high
    );

    // 2) other_user_id sammeln (✅ currentUserId rausfiltern)
    const otherUserIds = Array.from(
      new Set(
        conversations
          .map((c) => (c.user_low === currentUserId ? c.user_high : c.user_low))
          .filter((id): id is string => !!id && id !== currentUserId)
      )
    );

    if (otherUserIds.length === 0) {
      return res.status(200).json({ items: [] as ChatListItem[] });
    }

    // 3) Profile der anderen User holen
    const { data: userRows, error: userErr } = await supabase
      .from("users")
      .select("user_id, username, thumb_url")
      .in("user_id", otherUserIds);

    if (userErr) return res.status(500).json({ error: userErr.message });

    const userMap = new Map(
      ((userRows ?? []) as UserRow[]).map((u) => [
        u.user_id,
        { username: u.username ?? null, thumb_url: u.thumb_url ?? null },
      ])
    );

    // 4) Items bauen inkl. has_unread (+ self guard)
    const items: ChatListItem[] = conversations
      .map((c) => {
        const isLow = c.user_low === currentUserId;
        const other_user_id = isLow ? c.user_high : c.user_low;

        // ✅ zusätzlicher Guard: falls DB/Code doch weirdes liefert
        const is_self = !other_user_id || other_user_id === currentUserId;
        if (is_self) return null;

        const profile = userMap.get(other_user_id) ?? { username: null, thumb_url: null };
        const lastRead = isLow ? c.last_read_at_low : c.last_read_at_high;

        return {
          conversation_id: c.id,
          other_user_id,
          username: profile.username,
          thumb_url: profile.thumb_url,
          last_message_created_at: c.last_message_created_at ?? null,
          has_unread: isAfter(c.last_message_created_at ?? null, lastRead ?? null),
          is_self: false,
        };
      })
      .filter(isNonNull);

    return res.status(200).json({ items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}