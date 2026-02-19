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
          const prev = res.getHeader("Set-Cookie");
          const prevArr = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
          const nextArr = cookies.map(({ name, value, options }) =>
            serialize(name, value, { ...options, path: "/" })
          );
          res.setHeader("Set-Cookie", [...prevArr, ...nextArr]);
        },
      },
    }
  );
}

type Body = { password?: string; passwordRepeat?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  try {
    const raw = req.body;
    const body: Body = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    const password = body.password ?? "";
    const passwordRepeat = body.passwordRepeat ?? "";

    if (!password || !passwordRepeat) {
      return res.status(400).json({ ok: false, error: "Missing password" });
    }
    if (password !== passwordRepeat) {
      return res.status(400).json({ ok: false, error: "Passwords do not match" });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: "Password must be at least 8 characters" });
    }

    const supabase = getSupabaseServerClient(req, res);

    // ✅ muss eine Session haben (recovery link setzt die)
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return res.status(401).json({ ok: false, error: "No active session" });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}