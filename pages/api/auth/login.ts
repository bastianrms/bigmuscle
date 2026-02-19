// pages/api/auth/login.ts
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
          // wichtig: mehrere Set-Cookie header korrekt setzen
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

type Body = { identifier?: string; password?: string };
type Ok = { ok: true };
type Err = { error: string };

function looksLikeEmail(s: string) {
  return s.includes("@");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const raw = req.body;
    const body: Body = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    const identifier = (body.identifier ?? "").trim();
    const password = body.password ?? "";

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing identifier or password" });
    }

    let email = identifier;

    // username -> email lookup
    if (!looksLikeEmail(identifier)) {
      if (!supabaseAdmin) return res.status(500).json({ error: "Server misconfigured" });

      const { data: u, error: uErr } = await supabaseAdmin
        .from("users")
        .select("email")
        .ilike("username", identifier) // oder .eq wenn du case-sensitive willst
        .maybeSingle();

      if (uErr) return res.status(500).json({ error: uErr.message });

      email = (u as { email?: string | null } | null)?.email ?? "";
      if (!email) return res.status(401).json({ error: "Invalid login" }); // bewusst generisch
    }

    const supabase = getSupabaseServerClient(req, res);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) return res.status(401).json({ error: "Invalid login" });

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}