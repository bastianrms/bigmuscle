// pages/api/auth/request-password-reset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

type Body = {
  email?: string;
  redirectTo?: string; // default: "/api/auth/passwordResetConfirm?next=/passwordreset"
};

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<typeof serialize>[2];
};

function getOrigin(req: NextApiRequest) {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "localhost:3000";
  return `${proto}://${host}`;
}

function getSupabaseClient(req: NextApiRequest, res: NextApiResponse) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = (req.body ?? {}) as Body;
    const email = (body.email ?? "").trim();
    if (!email) return res.status(200).json({ ok: true }); // bewusst generisch

    const origin = getOrigin(req);

    const redirectPath =
      (body.redirectTo ?? "/api/auth/passwordResetConfirm?next=/passwordreset").trim();

    const redirectTo = `${origin}${redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`}`;

    const supabase = getSupabaseClient(req, res);

 const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

if (error) {
  console.warn("[request-password-reset] supabase:", error.message);
  return res.status(400).json({ ok: false, error: error.message });
}


    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    console.error("[request-password-reset] fatal:", e);
    return res.status(200).json({ ok: true }); // auch hier: nicht leaken
  }
}