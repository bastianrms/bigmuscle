// components/UsersNowOnlineShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

import type { UserCard } from "@/lib/user/cards";
import { applyThumbFallbackList } from "@/lib/user/cards";

type Cursor = {
  last_active_at: string;
  user_id: string;
};

type ApiResponse = {
  ok?: boolean;
  items?: UserCard[];
  next_cursor?: Cursor | null;
};

const DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY: UserCard[] = [
  {
    user_id: "demo-1",
    username: "ironmax",
    thumb_url: DUMMY_THUMB,
    country: "Germany",
    city: "Berlin",
    height_cm: 185,
    weight_kg: 92,
    unit_system: "metric",
    height_display: "185 cm",
    weight_display: "92 kg",
  },
  {
    user_id: "demo-2",
    username: "bicepsking",
    thumb_url: null,
    country: "Austria",
    city: "Vienna",
    height_cm: 178,
    weight_kg: 102,
    unit_system: "imperial",
    height_display: `5'10"`,
    weight_display: "225 lb",
  },
  {
    user_id: "demo-3",
    username: "flexbear",
    thumb_url: DUMMY_THUMB,
    country: "Switzerland",
    city: "Zürich",
    height_cm: 192,
    weight_kg: 110,
    unit_system: "metric",
    height_display: "192 cm",
    weight_display: "110 kg",
  },
];

export function UsersNowOnlineShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string;
  initialLimit?: number;
  pageSize?: number;
  cutoffMinutes?: number;
  includeSelf?: boolean;
  dataName?: string;
  fallbackThumbUrl?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/nowOnline",
    initialLimit = 6,
    pageSize = 6,
    cutoffMinutes = 15,
    includeSelf = false,
    dataName = "usersNowOnline",
    fallbackThumbUrl,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [items, setItems] = React.useState<UserCard[]>(inStudio ? STUDIO_DUMMY : []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [limit, setLimit] = React.useState<number>(initialLimit);
  const [hasMore, setHasMore] = React.useState<boolean>(false);

  React.useEffect(() => {
    setLimit(initialLimit);
  }, [initialLimit]);

  const loadMore = React.useCallback(() => {
    setLimit((n) => n + Math.max(1, pageSize));
  }, [pageSize]);

  React.useEffect(() => {
    if (inStudio) {
      setItems(applyThumbFallbackList(STUDIO_DUMMY, fallbackThumbUrl));
      setLoading(false);
      setError(null);
      setHasMore(true);
      return;
    }
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    qs.set("cutoff_minutes", String(cutoffMinutes));
    qs.set("include_self", includeSelf ? "1" : "0");

    fetch(`${endpoint}?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
        return JSON.parse(txt) as ApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        const next = Array.isArray(json?.items) ? json.items : [];
        setItems(applyThumbFallbackList(next, fallbackThumbUrl));
        setHasMore(!!json?.next_cursor);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;

        const msg = e instanceof Error ? e.message : String(e);

        if (msg.toLowerCase().includes("not authenticated")) {
          setItems(applyThumbFallbackList(STUDIO_DUMMY, fallbackThumbUrl));
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
  }, [inStudio, enabled, endpoint, limit, cutoffMinutes, includeSelf, fallbackThumbUrl]);

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

export default UsersNowOnlineShell;