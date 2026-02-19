// pages/api/auth/confirm.ts
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

function safeNext(next?: string | string[]) {
  const n = Array.isArray(next) ? next[0] : next;
  if (!n) return "/profile-setup";
  // nur relative Pfade erlauben (Open-Redirect vermeiden)
  return n.startsWith("/") ? n : "/profile-setup";
}

// ✅ verifyOtp() ohne phone => nur EmailOtpType zulassen
type EmailVerifyOtpType = "email" | "magiclink" | "recovery" | "invite" | "email_change";

function normalizeEmailVerifyOtpType(v: unknown): EmailVerifyOtpType {
  const s = String(v ?? "").toLowerCase();
  const allowed: Record<string, EmailVerifyOtpType> = {
    email: "email",
    magiclink: "magiclink",
    recovery: "recovery",
    invite: "invite",
    email_change: "email_change",
  };
  return allowed[s] ?? "email";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token_hash = String(req.query.token_hash || "");
  const type = normalizeEmailVerifyOtpType(req.query.type);
  const next = safeNext(req.query.next);

  if (!token_hash) return res.redirect(302, "/confirmemail?error=missing_token");

  const supabase = getSupabaseServerClient(req, res);

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    return res.redirect(302, `/confirmemail?error=${encodeURIComponent(error.message)}`);
  }

  return res.redirect(302, next);
}