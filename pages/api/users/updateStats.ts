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

type UnitSystem = "metric" | "imperial";

type Body = {
  unit_system?: UnitSystem;

  bio?: string | null;

  height_cm?: number | string | null;
  weight_kg?: number | string | null;
  chest_cm?: number | string | null;
  arms_cm?: number | string | null;
  waist_cm?: number | string | null;
  thigh_cm?: number | string | null;
  calf_cm?: number | string | null;
  bodyfat_percent?: number | string | null;

  // ✅ NEW
  country?: string | null;
  city?: string | null;
  country_code?: string | null;
  city_geoname_id?: number | string | null;
};

function isUnitSystem(v: unknown): v is UnitSystem {
  return v === "metric" || v === "imperial";
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const normalized = s.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  const t = s.trim();
  return t.length ? t : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = getSupabaseServerClient(req, res);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (authErr || !userId) return res.status(401).json({ error: "Not authenticated" });

    const raw = req.body;
    const body: Body =
      typeof raw === "string" ? (JSON.parse(raw) as Body) : ((raw ?? {}) as Body);

    const unit_system = isUnitSystem(body.unit_system) ? body.unit_system : null;
    if (!unit_system) return res.status(400).json({ error: "unit_system is required" });

    const patch = {
      unit_system,

      bio: strOrNull(body.bio),

      height_cm: numOrNull(body.height_cm),
      weight_kg: numOrNull(body.weight_kg),
      chest_cm: numOrNull(body.chest_cm),
      arms_cm: numOrNull(body.arms_cm),
      waist_cm: numOrNull(body.waist_cm),
      thigh_cm: numOrNull(body.thigh_cm),
      calf_cm: numOrNull(body.calf_cm),
      bodyfat_percent: numOrNull(body.bodyfat_percent),

      // ✅ NEW
      country: strOrNull(body.country),
      city: strOrNull(body.city),
      country_code: strOrNull(body.country_code),
      city_geoname_id: numOrNull(body.city_geoname_id),
    };

    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("user_id", userId)
      .select(
        "unit_system,bio,height_cm,weight_kg,chest_cm,arms_cm,waist_cm,thigh_cm,calf_cm,bodyfat_percent,country,city,country_code,city_geoname_id"
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, profile: data });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}