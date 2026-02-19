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

type ConvRow = {
  id: string;
  user_low: string;
  user_high: string;
  last_message_created_at: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

    const { conversation_id } = (req.body ?? {}) as { conversation_id?: string };
    if (!conversation_id) {
      return res.status(400).json({ error: "Missing conversation_id" });
    }

    const { data: conv, error: convErr } = await supabase
      .from("chat_users")
      .select("id, user_low, user_high, last_message_created_at")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convErr) return res.status(500).json({ error: convErr.message });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const row = conv as ConvRow;

    const nowIso = new Date().toISOString();
    const readTime = row.last_message_created_at ?? nowIso;

    if (row.user_low === currentUserId) {
      const { error } = await supabase
        .from("chat_users")
        .update({ last_read_at_low: readTime })
        .eq("id", conversation_id);
      if (error) return res.status(500).json({ error: error.message });
    } else if (row.user_high === currentUserId) {
      const { error } = await supabase
        .from("chat_users")
        .update({ last_read_at_high: readTime })
        .eq("id", conversation_id);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      return res.status(403).json({ error: "Not a participant" });
    }

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}