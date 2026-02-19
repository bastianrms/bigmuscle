// pages/api/chat/send.ts
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

// UUID Vergleich als String reicht für stabile Reihenfolge.
function getLowHigh(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

type SendBody = {
  receiverId?: string;
  content?: string;
};

type ChatUsersRow = {
  id: string;
  user_low: string;
  user_high: string;
  created_at: string | null;
  updated_at: string | null;
  last_read_at_low: string | null;
  last_read_at_high: string | null;
};

type ChatMessageRow = {
  id: string;
  chat_user_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  created_at: string;
};

type ChatUsersPatch = {
  updated_at: string;
  last_message_created_at: string;
  last_read_at_low?: string;
  last_read_at_high?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { receiverId, content } = (req.body ?? {}) as SendBody;
    const messageText = content?.trim();

    if (!receiverId || !messageText) {
      return res
        .status(400)
        .json({ error: "receiverId and content are required" });
    }

    const senderId = user.id;
    const { low, high } = getLowHigh(senderId, receiverId);

    // 1) chat_users upsert (unique: user_low,user_high)
    const { data: chatUserRow, error: chatUserErr } = await supabase
      .from("chat_users")
      .upsert(
        {
          user_low: low,
          user_high: high,
        },
        { onConflict: "user_low,user_high" }
      )
      .select(
        "id,user_low,user_high,created_at,updated_at,last_read_at_low,last_read_at_high"
      )
      .single();

    if (chatUserErr || !chatUserRow) {
      return res.status(400).json({
        error: chatUserErr?.message ?? "Failed to upsert chat_users",
      });
    }

    const chatUser = chatUserRow as ChatUsersRow;
    const chatUserId = chatUser.id;

    // 2) Nachricht anlegen
    const { data: messageRow, error: msgErr } = await supabase
      .from("chat_messages")
      .insert({
        chat_user_id: chatUserId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: messageText,
      })
      .select("id, chat_user_id, sender_id, receiver_id, content, created_at")
      .single();

    if (msgErr || !messageRow) {
      return res.status(400).json({
        error: msgErr?.message ?? "Failed to insert message",
      });
    }

    const message = messageRow as ChatMessageRow;

    // 3) chat_users “touch”:
    // - updated_at + last_message_created_at = message.created_at
    // - last_read_at_* für den Sender setzen (damit Sender keinen New-Badge bekommt)
    const msgTime = message.created_at ?? new Date().toISOString();

    const patch: ChatUsersPatch = {
      updated_at: msgTime,
      last_message_created_at: msgTime,
    };

    if (senderId === low) {
      patch.last_read_at_low = msgTime;
    } else if (senderId === high) {
      patch.last_read_at_high = msgTime;
    }

    const { error: touchErr } = await supabase
      .from("chat_users")
      .update(patch)
      .eq("id", chatUserId);

    if (touchErr) {
      return res.status(400).json({ error: touchErr.message });
    }

    return res.status(200).json({
      ok: true,
      chat_user: chatUser,
      message,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}