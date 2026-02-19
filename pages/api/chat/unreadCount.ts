// pages/api/chat/unreadCount.ts
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
          // wichtig: mehrere Set-Cookie sauber setzen
          const headers: string[] = [];
          cookies.forEach(({ name, value, options }) => {
            headers.push(serialize(name, value, { ...options, path: "/" }));
          });
          if (headers.length) res.setHeader("Set-Cookie", headers);
        },
      },
    }
  );
}

type ChatUserRow = {
  id: string;
  user_low: string;
  user_high: string;
  last_message_created_at: string | null;
  last_read_at_low: string | null;
  last_read_at_high: string | null;
};

type ResponseOk = { ok: true; count: number };
type ResponseErr = { error: string };

function isAfter(a: string | null, b: string | null) {
  if (!a) return false;
  if (!b) return true; // nie gelesen -> unread
  return new Date(a).getTime() > new Date(b).getTime();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Nav-Badge darf kurz micro-cachen (spart DB), bleibt “fast live”
  res.setHeader("Cache-Control", "private, max-age=10, stale-while-revalidate=30");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const currentUserId = authData.user.id;

    const { data: convRows, error: convErr } = await supabase
      .from("chat_users")
      .select("id,user_low,user_high,last_message_created_at,last_read_at_low,last_read_at_high")
      .or(`user_low.eq.${currentUserId},user_high.eq.${currentUserId}`);

    if (convErr) return res.status(500).json({ error: convErr.message });

    const conversations = ((convRows ?? []) as ChatUserRow[]).filter((c) => c.user_low !== c.user_high);

    const count = conversations.reduce((acc, c) => {
      const isLow = c.user_low === currentUserId;
      const lastRead = isLow ? c.last_read_at_low : c.last_read_at_high;
      return acc + (isAfter(c.last_message_created_at, lastRead) ? 1 : 0);
    }, 0);

    return res.status(200).json({ ok: true, count });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}