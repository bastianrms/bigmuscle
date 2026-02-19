// pages/api/photos/saveVisibilityBatch.ts
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
          cookies.forEach(({ name, value, options }) => {
            res.setHeader("Set-Cookie", serialize(name, value, { ...options, path: "/" }));
          });
        },
      },
    }
  );
}

type Visibility = "public" | "private";

type Body = {
  updates?: Array<{ id?: string; visibility?: Visibility }>;
};

type ResponseOk = {
  ok: true;
  updated: number;
};

type ResponseErr = { error: string };

function safeJsonParse<T>(v: unknown): T | null {
  if (typeof v !== "string") return (v as T) ?? null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // private user action
  res.setHeader("Cache-Control", "private, no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const body = safeJsonParse<Body>(req.body) ?? {};
    const raw = Array.isArray(body.updates) ? body.updates : [];

    // sanitize + de-dupe (last write wins)
    const map = new Map<string, Visibility>();
    for (const u of raw) {
      const id = typeof u?.id === "string" ? u.id.trim() : "";
      const vis = u?.visibility;
      if (!id) continue;
      if (vis !== "public" && vis !== "private") continue;
      map.set(id, vis);
    }

    const updates = Array.from(map.entries()).map(([id, visibility]) => ({ id, visibility }));

    if (updates.length === 0) {
      return res.status(200).json({ ok: true, updated: 0 });
    }

    // Ownership safety: update only rows belonging to this user.
    // Simple & safe approach: loop updates.
    // With <=200 items it's fine.
    let updated = 0;

    for (const u of updates) {
      const { error } = await supabase
        .from("user_photos")
        .update({ visibility: u.visibility })
        .eq("id", u.id)
        .eq("user_id", user.id);

      if (error) return res.status(500).json({ error: error.message });

      updated += 1;
    }

    return res.status(200).json({ ok: true, updated });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}