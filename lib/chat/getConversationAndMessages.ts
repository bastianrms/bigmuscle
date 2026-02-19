// lib/chat/getConversationAndMessages.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatMessageVM = {
  id: string;
  chat_user_id: string | null;
  sender_id: string;
  receiver_id: string | null;
  content: string | null;
  created_at: string;
  sender_thumb_url: string | null;
  created_at_relative: string;
};

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

export async function getConversationId(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
) {
  const [low, high] =
    currentUserId < otherUserId
      ? [currentUserId, otherUserId]
      : [otherUserId, currentUserId];

  const { data, error } = await supabase
    .from("chat_users")
    .select("id")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function getLatestMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 30
) {
  // Wir holen die letzten 30 als DESC und drehen dann auf ASC, damit UI sauber von oben->unten läuft.
  const { data: rows, error } = await supabase
    .from("chat_messages")
    .select("id, chat_user_id, sender_id, receiver_id, content, created_at")
    .eq("chat_user_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const messages = (rows ?? []).slice().reverse();

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("user_id, thumb_url")
    .in("user_id", senderIds);

  if (uErr) throw new Error(uErr.message);

  const thumbMap = new Map((users ?? []).map((u) => [u.user_id, u.thumb_url ?? null]));

  const vm: ChatMessageVM[] = messages.map((m) => ({
    id: m.id,
    chat_user_id: m.chat_user_id ?? null,
    sender_id: m.sender_id,
    receiver_id: m.receiver_id ?? null,
    content: m.content ?? null,
    created_at: m.created_at,
    sender_thumb_url: thumbMap.get(m.sender_id) ?? null,
    created_at_relative: formatRelativeTime(m.created_at),
  }));

  return vm;
}