// pages/api/chat/ChatMessagesQuery.ts
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

function getLowHigh(a: string, b: string) {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  return aa < bb ? { low: aa, high: bb } : { low: bb, high: aa };
}

type UserRow = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;
};

type ChatUsersRow = {
  id: string;
};

type ChatMessageRow = {
  id: string;
  sender_id: string;
  content: string | null;
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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // ✅ neu: wir akzeptieren entweder other_user_id ODER other_username
    const otherUserIdRaw = req.query.other_user_id;
    const otherUsernameRaw = req.query.other_username;

    let otherUserId =
      typeof otherUserIdRaw === "string" ? otherUserIdRaw.trim() : null;

    const otherUsername =
      typeof otherUsernameRaw === "string" ? otherUsernameRaw.trim() : null;

    // Wenn kein other_user_id, aber username vorhanden -> user_id nachschlagen
    if (!otherUserId && otherUsername) {
      const { data: u, error: uErr } = await supabase
        .from("users")
        .select("user_id")
        .eq("username", otherUsername)
        .maybeSingle<{ user_id: string }>();

      if (uErr) return res.status(500).json({ error: uErr.message });
      if (!u?.user_id) return res.status(404).json({ error: "User not found" });

      otherUserId = u.user_id;
    }

    if (!otherUserId) {
      return res
        .status(400)
        .json({ error: "Missing other_user_id or other_username" });
    }

    const limitRaw = req.query.limit;
    const limit = Math.max(
      1,
      Math.min(
        100,
        typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 30 : 30
      )
    );

    // 1) other_user Profil holen (users table)
    const { data: otherUser, error: otherUserErr } = await supabase
      .from("users")
      .select("user_id, username, thumb_url")
      .eq("user_id", otherUserId)
      .maybeSingle<UserRow>();

    if (otherUserErr) {
      return res.status(500).json({ error: otherUserErr.message });
    }

    // 2) conversation id finden (chat_users)
    const { low, high } = getLowHigh(user.id, otherUserId);

    const { data: conv, error: convErr } = await supabase
      .from("chat_users")
      .select("id")
      .eq("user_low", low)
      .eq("user_high", high)
      .maybeSingle<ChatUsersRow>();

    if (convErr) {
      return res.status(500).json({ error: convErr.message });
    }

    // Keine Conversation? Dann leere Liste, aber other_user trotzdem zurückgeben
    if (!conv?.id) {
      return res.status(200).json({
        conversation_id: null,
        other_user: otherUser
          ? {
              user_id: otherUser.user_id,
              username: otherUser.username ?? null,
              thumb_url: otherUser.thumb_url ?? null,
            }
          : null,
        items: [],
      });
    }

    // 3) messages holen (neueste zuerst)
    const { data: rows, error: msgErr } = await supabase
      .from("chat_messages")
      .select("id, sender_id, content, created_at")
      .eq("chat_user_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (msgErr) {
      return res.status(500).json({ error: msgErr.message });
    }

    const typedRows = (rows ?? []) as ChatMessageRow[];

    const items = typedRows.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content ?? null,
      created_at: m.created_at,
      created_at_relative: formatRelativeTime(m.created_at),
    }));

    return res.status(200).json({
      conversation_id: conv.id,
      other_user: otherUser
        ? {
            user_id: otherUser.user_id,
            username: otherUser.username ?? null,
            thumb_url: otherUser.thumb_url ?? null,
          }
        : null,
      items,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}