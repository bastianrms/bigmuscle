// pages/api/users/search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ResponseOk = {
  ok: true;
  exists: boolean;
  normalized: string;
};

type ResponseErr = { error: string };

function normalizeUsername(v: string) {
  return v.trim().toLowerCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseOk | ResponseErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // search endpoint darf kurz cachen
  res.setHeader("Cache-Control", "private, max-age=30");

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server misconfigured: supabaseAdmin missing" });
    }

    const raw = typeof req.query.username === "string" ? req.query.username : "";
    const username = normalizeUsername(raw);

    if (!username) {
      return res.status(200).json({ ok: true, exists: false, normalized: "" });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("user_id")
      .eq("username", username)
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      ok: true,
      exists: (data ?? []).length > 0,
      normalized: username,
    });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}