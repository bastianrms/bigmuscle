"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type UnitSystem = "metric" | "imperial";

export type UserCardItem = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;

  country?: string | null;
  city?: string | null;

  unit_system?: UnitSystem;
  height_display?: string | null;
  weight_display?: string | null;

  last_active_at?: string | null;
  created_at?: string | null;
};

type Cursor =
  | { last_active_at: string; user_id: string }
  | { created_at: string; user_id: string }
  | Record<string, unknown>
  | null;

type ApiResponse = {
  ok?: boolean;
  items?: UserCardItem[];
  next_cursor?: Cursor;
};

const DEFAULT_DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

function applyThumbFallback(items: UserCardItem[], fallback: string | null | undefined) {
  const fb = (fallback ?? "").trim();
  if (!fb) return items;
  return items.map((it) => ({
    ...it,
    thumb_url: it.thumb_url ? it.thumb_url : fb,
  }));
}

function makeStudioDummy(count: number, thumb: string): UserCardItem[] {
  const n = Math.max(1, Math.min(24, Math.trunc(count || 6)));
  const out: UserCardItem[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      user_id: `demo-${i + 1}`,
      username: `demo_user_${i + 1}`,
      thumb_url: thumb,
      country: "Germany",
      city: "Berlin",
      unit_system: i % 2 === 0 ? "metric" : "imperial",
      height_display: i % 2 === 0 ? "185 cm" : `6'0"`,
      weight_display: i % 2 === 0 ? "92 kg" : "205 lb",
      created_at: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
      last_active_at: new Date(Date.now() - (i + 1) * 10 * 60 * 1000).toISOString(),
    });
  }
  return out;
}

function buildUrl(endpoint: string, qs: URLSearchParams) {
  const base = endpoint || "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${qs.toString()}`;
}

function readUnitFromClientCache(): UnitSystem | null {
  if (typeof window === "undefined") return null;

  // window.__bmUnitSystem (ohne any)
  const w = (window as unknown as { __bmUnitSystem?: unknown }).__bmUnitSystem;
  if (w === "metric" || w === "imperial") return w;

  try {
    const ls = window.localStorage.getItem("bm:unitSystem");
    if (ls === "metric" || ls === "imperial") return ls;
  } catch {
    // ignore
  }

  return null;
}

export function UserCardShell(props: {
  children?: React.ReactNode;

  enabled?: boolean;
  endpoint?: string;

  initialLimit?: number;
  pageSize?: number;

  includeSelf?: boolean;

  extraParams?: Record<string, string | number | boolean | null | undefined>;

  dataName?: string;

  fallbackThumbUrl?: string;

  studioDummyCount?: number;
  studioDummyThumbUrl?: string;

  // ✅ optional: if you want to hard-limit and disable "load more"
  maxLimit?: number | null;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/nowOnline",
    initialLimit = 6,
    pageSize = 6,
    includeSelf = false,
    extraParams,
    dataName = "userCards",
    fallbackThumbUrl,
    studioDummyCount = 6,
    studioDummyThumbUrl = DEFAULT_DUMMY_THUMB,
    maxLimit = null,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [items, setItems] = React.useState<UserCardItem[]>(
    inStudio ? makeStudioDummy(studioDummyCount, studioDummyThumbUrl) : []
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [limit, setLimit] = React.useState<number>(initialLimit);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  // ✅ viewer unit system (from window/localStorage, so it's instantly correct)
  const [viewerUnit, setViewerUnit] = React.useState<UnitSystem>(() => {
    if (inStudio) return "imperial";
    return readUnitFromClientCache() ?? "imperial";
  });

  // ✅ unit switch => cache-bust + reload
  const [reloadTick, setReloadTick] = React.useState(0);

  React.useEffect(() => {
    setLimit(initialLimit);
  }, [initialLimit]);

  React.useEffect(() => {
    if (inStudio) return;

    const onChanged = (ev: Event) => {
      if (ev instanceof CustomEvent) {
        const detail = ev.detail as unknown;
        const next = (detail as { unitSystem?: unknown } | null)?.unitSystem;
        if (next === "metric" || next === "imperial") {
          setViewerUnit(next);
        } else {
          const cached = readUnitFromClientCache();
          if (cached) setViewerUnit(cached);
        }
      } else {
        const cached = readUnitFromClientCache();
        if (cached) setViewerUnit(cached);
      }

      setReloadTick((n) => n + 1);
    };

    window.addEventListener("bm:unitSystemChanged", onChanged);
    return () => window.removeEventListener("bm:unitSystemChanged", onChanged);
  }, [inStudio]);

  const loadMore = React.useCallback(() => {
    if (maxLimit != null && limit >= maxLimit) return;
    setLimit((n) => {
      const next = n + Math.max(1, pageSize);
      return maxLimit != null ? Math.min(next, maxLimit) : next;
    });
  }, [pageSize, maxLimit, limit]);

  React.useEffect(() => {
    if (inStudio) {
      const studioItems = makeStudioDummy(studioDummyCount, studioDummyThumbUrl);
      setItems(applyThumbFallback(studioItems, fallbackThumbUrl));
      setLoading(false);
      setError(null);
      setHasMore(true);
      return;
    }

    if (!enabled) {
      setItems([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      return;
    }

    // ✅ prevent first fetch with wrong unit (no flicker)
    const cached = readUnitFromClientCache();
    if (!cached) {
      setLoading(false);
      return;
    }
    if (cached !== viewerUnit) {
      setViewerUnit(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    qs.set("include_self", includeSelf ? "1" : "0");

    // ✅ send unit to API (stable + cache-friendly per unit)
    qs.set("unit_system", viewerUnit);

    // ✅ cache-buster only when unit changed
    if (reloadTick > 0) qs.set("_u", String(reloadTick));

    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v === null || v === undefined) continue;
        qs.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
      }
    }

    const url = buildUrl(endpoint, qs);

    fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
        return JSON.parse(txt) as ApiResponse;
      })
      .then((json) => {
        if (cancelled) return;

        const next = Array.isArray(json?.items) ? json.items : [];
        const withFallback = applyThumbFallback(next, fallbackThumbUrl);

        setItems(withFallback);

        const apiHasMore = !!json?.next_cursor;
        if (maxLimit != null && limit >= maxLimit) {
          setHasMore(false);
        } else {
          setHasMore(apiHasMore);
        }

        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;

        const msg = e instanceof Error ? e.message : String(e);

        if (msg.toLowerCase().includes("not authenticated")) {
          const studioItems = makeStudioDummy(studioDummyCount, studioDummyThumbUrl);
          setItems(applyThumbFallback(studioItems, fallbackThumbUrl));
          setHasMore(true);
          setError(null);
          setLoading(false);
          return;
        }

        setItems([]);
        setHasMore(false);
        setLoading(false);
        setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [
    inStudio,
    enabled,
    endpoint,
    limit,
    includeSelf,
    extraParams,
    fallbackThumbUrl,
    studioDummyCount,
    studioDummyThumbUrl,
    reloadTick,
    viewerUnit,
    maxLimit,
  ]);

  const ctx = React.useMemo(
    () => ({
      items,
      loading,
      error,
      hasMore,
      loadMore,
    }),
    [items, loading, error, hasMore, loadMore]
  );

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}

export default UserCardShell;