import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

function getSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // wichtig: für session-cookie auth
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

// Lexicographic compare reicht, solange du immer gleich normalisierst.
// UUIDs sind strings, damit ist "sortieren" stabil.
function getLowHigh(a: string, b: string) {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  return aa < bb ? { low: aa, high: bb } : { low: bb, high: aa };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { receiverId, content } = req.body as {
      receiverId?: string;
      content?: string;
    };

    const messageText = content?.trim();

    if (!receiverId || !messageText) {
      return res
        .status(400)
        .json({ error: "receiverId and content are required" });
    }

    const senderId = user.id;
    const { low, high } = getLowHigh(senderId, receiverId);

    // 1) chat_users upsert (unique auf user_low,user_high vorausgesetzt)
    const { data: chatUserRow, error: chatUserErr } = await supabase
      .from("chat_users")
      .upsert(
        {
          user_low: low,
          user_high: high,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_low,user_high" }
      )
      .select("id,user_low,user_high,created_at,updated_at")
      .single();

    if (chatUserErr || !chatUserRow) {
      return res.status(400).json({
        error: chatUserErr?.message ?? "Failed to upsert chat_users",
      });
    }

    const chatUserId = chatUserRow.id;

    // 2) Nachricht anlegen
    const { data: messageRow, error: msgErr } = await supabase
      .from("chat_messages")
      .insert({
        chat_user_id: chatUserId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: messageText,
      })
      .select("*")
      .single();

    if (msgErr || !messageRow) {
      return res.status(400).json({
        error: msgErr?.message ?? "Failed to insert message",
      });
    }

    // Optional: updated_at nochmal “hart” setzen (kannst du später durch Trigger ersetzen)
    await supabase
      .from("chat_users")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatUserId);

    return res.status(200).json({
      ok: true,
      chat_user: chatUserRow,
      message: messageRow,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}