// pages/api/auth/passwordResetConfirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<typeof serialize>[2];
};

function getSupabaseAuthedClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.cookie ?? "";
          const parsed = parse(cookieHeader);
          return Object.entries(parsed).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet: CookieToSet[]) {
          const prev = res.getHeader("Set-Cookie");
          const prevArr = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
          const nextArr = cookiesToSet.map(({ name, value, options }) =>
            serialize(name, value, { path: "/", ...(options ?? {}) })
          );
          res.setHeader("Set-Cookie", [...prevArr, ...nextArr]);
        },
      },
    }
  );
}

function safeNext(next: string | undefined) {
  const n = (next ?? "/passwordreset").trim();
  // nur relative Pfade erlauben
  if (!n.startsWith("/")) return "/passwordreset";
  return n;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token_hash = (req.query.token_hash as string | undefined) ?? "";
    const type = (req.query.type as string | undefined) ?? "recovery";
    const next = safeNext(req.query.next as string | undefined);

    if (!token_hash) {
      return res.redirect(`/passwordreset?error=missing_token`);
    }

    const supabase = getSupabaseAuthedClient(req, res);

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery",
    });

    if (error) {
      console.warn("[passwordResetConfirm] verifyOtp:", error.message);
      return res.redirect(`/passwordreset?error=invalid_or_expired`);
    }

    return res.redirect(next);
  } catch (e: unknown) {
    console.error("[passwordResetConfirm] fatal:", e);
    return res.redirect(`/passwordreset?error=unknown`);
  }
}