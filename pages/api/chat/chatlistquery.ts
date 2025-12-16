// pages/api/chat/chatlistquery.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

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
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.setHeader(
              "Set-Cookie",
              serialize(name, value, {
                ...options,
                path: "/",
              })
            );
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
  updated_at: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const currentUserId = authData.user.id;

    // 1) Alle Konversationen, an denen der User beteiligt ist.
    const { data: convRows, error: convErr } = await supabase
      .from("chat_users")
      .select("id, user_low, user_high, updated_at")
      .or(`user_low.eq.${currentUserId},user_high.eq.${currentUserId}`)
      .order("updated_at", { ascending: false });

    if (convErr) {
      return res.status(500).json({ error: convErr.message });
    }

    const conversations = convRows ?? [];

    // 2) other_user_id pro Konversation bestimmen.
    const otherUserIds = Array.from(
      new Set(
        conversations
          .map((c) => (c.user_low === currentUserId ? c.user_high : c.user_low))
          .filter(Boolean)
      )
    );

    if (otherUserIds.length === 0) {
      return res.status(200).json({ items: [] as ChatListItem[] });
    }

    // 3) Profile-Infos der anderen User in einem Rutsch holen.
    const { data: userRows, error: userErr } = await supabase
      .from("users")
      .select("user_id, username, thumb_url")
      .in("user_id", otherUserIds);

    if (userErr) {
      return res.status(500).json({ error: userErr.message });
    }

    const userMap = new Map(
      (userRows ?? []).map((u) => [
        u.user_id,
        { username: u.username ?? null, thumb_url: u.thumb_url ?? null },
      ])
    );

    // 4) Fertige Liste fürs Frontend bauen.
    const items: ChatListItem[] = conversations.map((c) => {
      const other_user_id =
        c.user_low === currentUserId ? c.user_high : c.user_low;

      const profile = userMap.get(other_user_id) ?? {
        username: null,
        thumb_url: null,
      };

      return {
        conversation_id: c.id,
        other_user_id,
        username: profile.username,
        thumb_url: profile.thumb_url,
        updated_at: c.updated_at ?? null,
      };
    });

    return res.status(200).json({ items });
    } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}