// components/UsersNewRegisteredShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

import type { UserCard } from "@/lib/user/cards";
import { applyThumbFallbackList } from "@/lib/user/cards";

export type NewRegisteredUser = UserCard & {
  created_at: string | null;
};

type Cursor = {
  created_at: string;
  user_id: string;
};

type ApiResponse = {
  ok?: boolean;
  items?: NewRegisteredUser[];
  next_cursor?: Cursor | null;
};

const DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY: NewRegisteredUser[] = [
  {
    user_id: "demo-new-1",
    username: "newbiemax",
    thumb_url: DUMMY_THUMB,
    country: "Germany",
    city: "Berlin",
    height_cm: 185,
    weight_kg: 92,
    unit_system: "metric",
    height_display: "185 cm",
    weight_display: "92 kg",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: "demo-new-2",
    username: "freshflex",
    thumb_url: null,
    country: "Austria",
    city: "Vienna",
    height_cm: 178,
    weight_kg: 102,
    unit_system: "imperial",
    height_display: `5'10"`,
    weight_display: "225 lb",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: "demo-new-3",
    username: "signupbear",
    thumb_url: DUMMY_THUMB,
    country: "Switzerland",
    city: "Zürich",
    height_cm: 192,
    weight_kg: 110,
    unit_system: "metric",
    height_display: "192 cm",
    weight_display: "110 kg",
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
];

export function UsersNewRegisteredShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string;
  initialLimit?: number;
  pageSize?: number;
  includeSelf?: boolean;
  dataName?: string;
  fallbackThumbUrl?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/newRegistered",
    initialLimit = 6,
    pageSize = 6,
    includeSelf = false,
    dataName = "usersNewRegistered",
    fallbackThumbUrl,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [items, setItems] = React.useState<NewRegisteredUser[]>(inStudio ? STUDIO_DUMMY : []);
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
      setItems(applyThumbFallbackList(STUDIO_DUMMY, fallbackThumbUrl) as NewRegisteredUser[]);
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
        setItems(applyThumbFallbackList(next, fallbackThumbUrl) as NewRegisteredUser[]);
        setHasMore(!!json?.next_cursor);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;

        const msg = e instanceof Error ? e.message : String(e);

        // Studio/Plasmic ohne Cookies -> Dummy anzeigen
        if (msg.toLowerCase().includes("not authenticated")) {
          setItems(applyThumbFallbackList(STUDIO_DUMMY, fallbackThumbUrl) as NewRegisteredUser[]);
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
  }, [inStudio, enabled, endpoint, limit, includeSelf, fallbackThumbUrl]);

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

export default UsersNewRegisteredShell;