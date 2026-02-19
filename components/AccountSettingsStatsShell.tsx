"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type UnitSystem = "metric" | "imperial";

export type AccountStats = {
  unit_system: UnitSystem;

  bio: string | null;

  height_cm: number | null;
  weight_kg: number | null;

  chest_cm: number | null;
  arms_cm: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;

  bodyfat_percent: number | null;

  // ✅ NEW
  country: string | null;
  city: string | null;
  country_code: string | null;
  city_geoname_id: number | null;
};

type GetResponse = { profile?: Partial<AccountStats> | null };
type PostResponse = { ok?: boolean; profile?: Partial<AccountStats> | null; error?: string };

const STUDIO_DUMMY: AccountStats = {
  unit_system: "imperial",
  bio: "Gym rat. Berlin. Leg day enjoyer.",
  height_cm: 185,
  weight_kg: 92,
  chest_cm: 118,
  arms_cm: 44,
  waist_cm: 84,
  thigh_cm: 64,
  calf_cm: 42,
  bodyfat_percent: 12,

  country: "Germany",
  city: "Berlin",
  country_code: "DE",
  city_geoname_id: 2950159,
};

function toNumOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toStrOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  const t = s.trim();
  return t.length ? t : null;
}

function normalizeUnitSystem(v: unknown): UnitSystem {
  return v === "imperial" ? "imperial" : "metric";
}

function mergeIntoDraft(base: AccountStats, patch?: Partial<AccountStats> | null): AccountStats {
  const p = patch ?? {};
  return {
    unit_system: normalizeUnitSystem(p.unit_system ?? base.unit_system),

    bio: toStrOrNull(p.bio ?? base.bio),

    height_cm: toNumOrNull(p.height_cm ?? base.height_cm),
    weight_kg: toNumOrNull(p.weight_kg ?? base.weight_kg),

    chest_cm: toNumOrNull(p.chest_cm ?? base.chest_cm),
    arms_cm: toNumOrNull(p.arms_cm ?? base.arms_cm),
    waist_cm: toNumOrNull(p.waist_cm ?? base.waist_cm),
    thigh_cm: toNumOrNull(p.thigh_cm ?? base.thigh_cm),
    calf_cm: toNumOrNull(p.calf_cm ?? base.calf_cm),

    bodyfat_percent: toNumOrNull(p.bodyfat_percent ?? base.bodyfat_percent),

    // ✅ NEW (ohne any)
    country: toStrOrNull(p.country ?? base.country),
    city: toStrOrNull(p.city ?? base.city),
    country_code: toStrOrNull(p.country_code ?? base.country_code),
    city_geoname_id: toNumOrNull(p.city_geoname_id ?? base.city_geoname_id),
  };
}

function isAccountStatsKey(k: string): k is keyof AccountStats {
  return (
    k === "unit_system" ||
    k === "bio" ||
    k === "height_cm" ||
    k === "weight_kg" ||
    k === "chest_cm" ||
    k === "arms_cm" ||
    k === "waist_cm" ||
    k === "thigh_cm" ||
    k === "calf_cm" ||
    k === "bodyfat_percent" ||
    k === "country" ||
    k === "city" ||
    k === "country_code" ||
    k === "city_geoname_id"
  );
}

export function AccountSettingsStatsShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpointGet?: string;
  endpointPost?: string;
  dataName?: string;
}) {
  const {
    children,
    enabled = true,
    endpointGet = "/api/users/accountSettingsStats",
    endpointPost = "/api/users/updateStats",
    dataName = "accountSettingsStats",
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [draft, setDraft] = React.useState<AccountStats>(
    inStudio
      ? STUDIO_DUMMY
      : {
          unit_system: "metric",
          bio: null,
          height_cm: null,
          weight_kg: null,
          chest_cm: null,
          arms_cm: null,
          waist_cm: null,
          thigh_cm: null,
          calf_cm: null,
          bodyfat_percent: null,

          country: null,
          city: null,
          country_code: null,
          city_geoname_id: null,
        }
  );

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(endpointGet, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text);
        return JSON.parse(text) as GetResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setDraft((prev) => mergeIntoDraft(prev, json?.profile ?? null));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, endpointGet, inStudio]);

  React.useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(t);
  }, [saved]);

  const setField = React.useCallback((key: string, value: unknown) => {
    setDraft((prev) => {
      const k = String(key || "").trim();

      // ✅ NEW: location keys (simple)
      if (k === "country") return { ...prev, country: toStrOrNull(value) };
      if (k === "city") return { ...prev, city: toStrOrNull(value) };
      if (k === "country_code") return { ...prev, country_code: toStrOrNull(value) };
      if (k === "city_geoname_id") return { ...prev, city_geoname_id: toNumOrNull(value) };

      if (k === "unit_system") {
        return { ...prev, unit_system: normalizeUnitSystem(value) };
      }

      if (k === "bio") {
        const s = value === null || value === undefined ? "" : String(value);
        const trimmed = s.trim();
        return { ...prev, bio: trimmed.length ? trimmed : null };
      }

      if (k === "weight") {
        const raw = String(value ?? "");
        const digitsOnly = raw.replace(/[^\d]/g, "");
        const n = digitsOnly ? Number(digitsOnly) : null;

        if (n === null || !Number.isFinite(n)) {
          return { ...prev, weight_kg: null };
        }

        if (prev.unit_system === "imperial") {
          const kg = n / 2.2046226218;
          return { ...prev, weight_kg: Math.round(kg) };
        }

        return { ...prev, weight_kg: Math.round(n) };
      }

      if (k === "height_cm") {
        return { ...prev, height_cm: toNumOrNull(value) };
      }

      const inchesToCm = (n: number) => Math.round(n * 2.54 * 10) / 10;

      if (k === "chest" || k === "chest_cm") {
        const n = toNumOrNull(value);
        if (n === null) return { ...prev, chest_cm: null };
        return prev.unit_system === "imperial"
          ? { ...prev, chest_cm: inchesToCm(n) }
          : { ...prev, chest_cm: n };
      }

      if (k === "arms" || k === "arms_cm") {
        const n = toNumOrNull(value);
        if (n === null) return { ...prev, arms_cm: null };
        return prev.unit_system === "imperial"
          ? { ...prev, arms_cm: inchesToCm(n) }
          : { ...prev, arms_cm: n };
      }

      if (k === "waist" || k === "waist_cm") {
        const n = toNumOrNull(value);
        if (n === null) return { ...prev, waist_cm: null };
        return prev.unit_system === "imperial"
          ? { ...prev, waist_cm: inchesToCm(n) }
          : { ...prev, waist_cm: n };
      }

      if (k === "thigh" || k === "thigh_cm") {
        const n = toNumOrNull(value);
        if (n === null) return { ...prev, thigh_cm: null };
        return prev.unit_system === "imperial"
          ? { ...prev, thigh_cm: inchesToCm(n) }
          : { ...prev, thigh_cm: n };
      }

      if (k === "calf" || k === "calf_cm") {
        const n = toNumOrNull(value);
        if (n === null) return { ...prev, calf_cm: null };
        return prev.unit_system === "imperial"
          ? { ...prev, calf_cm: inchesToCm(n) }
          : { ...prev, calf_cm: n };
      }

      if (k === "bodyfat" || k === "bodyfat_percent") {
        return { ...prev, bodyfat_percent: toNumOrNull(value) };
      }

      if (isAccountStatsKey(k)) {
        if (k === "unit_system") return { ...prev, unit_system: normalizeUnitSystem(value) };
        if (k === "bio") {
          const s = value === null || value === undefined ? "" : String(value);
          const trimmed = s.trim();
          return { ...prev, bio: trimmed.length ? trimmed : null };
        }
        // numeric keys
        return { ...prev, [k]: toNumOrNull(value) } as AccountStats;
      }

      return prev;
    });
  }, []);

  const save = React.useCallback(async () => {
    if (inStudio) return;
    if (saving) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const resp = await fetch(endpointPost, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          unit_system: draft.unit_system,
          bio: draft.bio,

          height_cm: draft.height_cm,
          weight_kg: draft.weight_kg,

          chest_cm: draft.chest_cm,
          arms_cm: draft.arms_cm,
          waist_cm: draft.waist_cm,
          thigh_cm: draft.thigh_cm,
          calf_cm: draft.calf_cm,

          bodyfat_percent: draft.bodyfat_percent,

          // ✅ NEW
          country: draft.country,
          city: draft.city,
          country_code: draft.country_code,
          city_geoname_id: draft.city_geoname_id,
        }),
      });

      const text = await resp.text();
      let data: PostResponse = {};
      try {
        data = text ? (JSON.parse(text) as PostResponse) : {};
      } catch {
        // ignore
      }

      if (!resp.ok) {
        throw new Error(data.error ?? text ?? "Update failed");
      }

      if (data?.profile) {
        setDraft((prev) => mergeIntoDraft(prev, data.profile ?? null));
      }

      setSaved(true);

      // ✅ sofort an die ganze Seite broadcasten
      window.dispatchEvent(
        new CustomEvent("bm:unitSystemChanged", {
          detail: { unitSystem: draft.unit_system },
        })
      );

      return data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [draft, endpointPost, inStudio, saving]);

  const ctxValue = React.useMemo(
    () => ({
      loading,
      saving,
      saved,
      error,

      draft,
      unit_system: draft.unit_system,

      setField,
      save,
    }),
    [loading, saving, saved, error, draft, setField, save]
  );

  return <DataProvider name={dataName} data={ctxValue}>{children}</DataProvider>;
}

export default AccountSettingsStatsShell;