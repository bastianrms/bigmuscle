// pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

type Body = {
  email?: string;
  password?: string;
  passwordRepeat?: string;
  emailRedirectTo?: string;
};

type SignupErrorCode =
  | "EMAIL_TAKEN"
  | "PASSWORD_MISMATCH"
  | "INVALID_EMAIL"
  | "MISSING_FIELDS"
  | "WEAK_PASSWORD"
  | "UNKNOWN";

type Ok = { ok: true };
type Err = { ok?: false; code: SignupErrorCode; error: string };

function isValidEmail(email: string) {
  // simpel, aber ok für UX; Supabase validiert sowieso nochmal
  return email.includes("@") && email.includes(".");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "UNKNOWN", error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const raw = req.body;
    const body: Body = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const passwordRepeat = body.passwordRepeat ?? "";

    if (!email || !password || !passwordRepeat) {
      return res.status(400).json({ code: "MISSING_FIELDS", error: "Missing email or password" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ code: "INVALID_EMAIL", error: "Please enter a valid email" });
    }
    if (password !== passwordRepeat) {
      return res.status(400).json({ code: "PASSWORD_MISMATCH", error: "Passwords do not match" });
    }

    // ✅ UX: check your users table first
    if (supabaseAdmin) {
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("users")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (exErr) return res.status(500).json({ code: "UNKNOWN", error: exErr.message });
      if (existing) return res.status(409).json({ code: "EMAIL_TAKEN", error: "Email already registered" });
    }

    const supabase = getSupabaseServerClient(req, res);

    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: body.emailRedirectTo ? { emailRedirectTo: body.emailRedirectTo } : undefined,
    });

    if (signUpErr) {
      const msg = signUpErr.message || "Signup failed";
      const lower = msg.toLowerCase();

      if (lower.includes("already") || lower.includes("registered")) {
        return res.status(409).json({ code: "EMAIL_TAKEN", error: "Email already registered" });
      }
      if (lower.includes("password")) {
        return res.status(400).json({ code: "WEAK_PASSWORD", error: msg });
      }

      return res.status(400).json({ code: "UNKNOWN", error: msg });
    }

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    return res.status(500).json({ code: "UNKNOWN", error: e instanceof Error ? e.message : String(e) });
  }
}