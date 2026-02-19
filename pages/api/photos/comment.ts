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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Body = {
  photo_id?: string;
  photoId?: string;
  content?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Next.js kann req.body als Objekt oder als String liefern.
    const raw = req.body;
    const body: Body =
      typeof raw === "string" ? (JSON.parse(raw) as Body) : ((raw ?? {}) as Body);

    const photoId = (body.photo_id ?? body.photoId ?? "").trim();
    const content = (body.content ?? "").trim();

    if (!photoId || !content) {
      return res.status(400).json({ error: "photo_id and content are required" });
    }
    if (!isUuid(photoId)) {
      return res.status(400).json({ error: "Invalid photo_id" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: "Comment too long" });
    }

    const { data: row, error: insErr } = await supabase
      .from("photo_comments")
      .insert({
        photo_id: photoId,
        user_id: user.id,
        content,
      })
      .select("id, photo_id, user_id, content, created_at")
      .single();

    if (insErr || !row) {
      // Wichtig: Hier kommt auch RLS-Fehlertext rein.
      return res.status(400).json({ error: insErr?.message ?? "Insert failed" });
    }

    return res.status(200).json({ ok: true, comment: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}