// pages/api/auth/profile-setup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

type ProfileSetupCode =
  | "NOT_AUTHENTICATED"
  | "MISSING_USERNAME"
  | "INVALID_USERNAME"
  | "USERNAME_TAKEN"
  | "UNKNOWN";

type Body = {
  username?: string;

  country_code?: string | null;
  city_geoname_id?: number | null;
  country?: string | null;
  city?: string | null;
};

function normalizeUsername(u: string) {
  // ✅ server-side normalization: remove whitespace and invalid chars too
  return (u ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

function isValidUsername(u: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u);
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, code: "UNKNOWN" satisfies ProfileSetupCode, error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAuthedClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({
        ok: false,
        code: "NOT_AUTHENTICATED" satisfies ProfileSetupCode,
        error: "Not authenticated",
      });
    }

    const body = (req.body ?? {}) as Body;
    const username = normalizeUsername(body.username ?? "");

    if (!username) {
      return res.status(400).json({
        ok: false,
        code: "MISSING_USERNAME" satisfies ProfileSetupCode,
        error: "Username is required",
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        ok: false,
        code: "INVALID_USERNAME" satisfies ProfileSetupCode,
        error: "Invalid username",
      });
    }

    const { error } = await supabase
      .from("users")
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          username,
          country_code: body.country_code ?? null,
          city_geoname_id: body.city_geoname_id ?? null,
          country: body.country ?? null,
          city: body.city ?? null,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      if ((error as { code?: string })?.code === "23505") {
        return res.status(409).json({
          ok: false,
          code: "USERNAME_TAKEN" satisfies ProfileSetupCode,
          error: "Username taken",
        });
      }

      return res.status(500).json({
        ok: false,
        code: "UNKNOWN" satisfies ProfileSetupCode,
        error: error.message ?? "Profile setup failed",
      });
    }

    return res.status(200).json({ ok: true, userId: user.id });
  } catch (e: unknown) {
    return res.status(500).json({
      ok: false,
      code: "UNKNOWN" satisfies ProfileSetupCode,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}