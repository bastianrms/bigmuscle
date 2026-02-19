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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (authErr || !userId) return res.status(401).json({ error: "Not authenticated" });

    const { data, error } = await supabase
      .from("users")
      .select(
        "unit_system,bio,height_cm,weight_kg,chest_cm,arms_cm,waist_cm,thigh_cm,calf_cm,bodyfat_percent,country,city,country_code,city_geoname_id"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ profile: data ?? null });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}