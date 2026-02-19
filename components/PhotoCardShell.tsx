// components/PhotoCardShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type PhotoCard = {
  id: string;
  user_id: string;
  username: string | null;
  thumb_url: string | null;
  like_count: number;
  created_at: string;
};

// ✅ Cursor ist bewusst “opaque”, damit jede API ihren eigenen Cursor liefern kann.
type Cursor = unknown;

type ApiResponse = {
  ok?: boolean;
  items?: PhotoCard[];
  next_cursor?: Cursor | null;
};

const DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY: PhotoCard[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `demo-photo-${i + 1}`,
  user_id: `demo-user-${i + 1}`,
  username: `demo${i + 1}`,
  thumb_url: DUMMY_THUMB,
  like_count: Math.round(Math.random() * 120),
  created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
}));

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default: /api/photos/newUploads
  initialLimit?: number; // first page size
  pageSize?: number; // subsequent page size
  includeSelf?: boolean;
  dataName?: string;

  fallbackThumbUrl?: string;

  enableInfiniteScroll?: boolean;
  rootMarginPx?: number;
};

type Ctx = {
  items: PhotoCard[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
};

function applyFallbackThumb(items: PhotoCard[], fallbackThumbUrl?: string): PhotoCard[] {
  if (!fallbackThumbUrl) return items;
  return items.map((it) => ({
    ...it,
    thumb_url: it.thumb_url ?? fallbackThumbUrl,
  }));
}

export function PhotoCardShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/photos/newUploads",
    initialLimit = 24,
    pageSize = 24,
    includeSelf = true,
    dataName = "photoCards",
    fallbackThumbUrl,
    enableInfiniteScroll = true,
    rootMarginPx = 800,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [items, setItems] = React.useState<PhotoCard[]>(inStudio ? STUDIO_DUMMY : []);
  const [cursor, setCursor] = React.useState<Cursor | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // ✅ hasMore ist nur true, wenn API einen Cursor liefert
  const hasMore = cursor !== null;

  const fetchPage = React.useCallback(
    async (opts: { reset: boolean }) => {
      if (!enabled) return;
      if (loading) return;

      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(opts.reset ? initialLimit : pageSize));
        qs.set("include_self", includeSelf ? "1" : "0");
        if (!opts.reset && cursor) qs.set("cursor", JSON.stringify(cursor));

        const r = await fetch(`${endpoint}?${qs.toString()}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          // ✅ Cache wird von der API gesteuert (Cache-Control Header).
        });

        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

        const json = JSON.parse(txt) as ApiResponse;
        const nextItems = Array.isArray(json?.items) ? (json.items as PhotoCard[]) : [];
        const nextCursor = (json?.next_cursor ?? null) as Cursor | null;

        setItems((prev) => {
          const merged = opts.reset ? nextItems : prev.concat(nextItems);

          // de-dupe by id
          const seen = new Set<string>();
          const deduped: PhotoCard[] = [];
          for (const it of merged) {
            if (!it?.id || seen.has(it.id)) continue;
            seen.add(it.id);
            deduped.push(it);
          }

          return applyFallbackThumb(deduped, fallbackThumbUrl);
        });

        setCursor(nextCursor);
        setLoading(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);

        // Studio/Plasmic ohne Cookies -> Dummy
        if (msg.toLowerCase().includes("not authenticated")) {
          setItems(applyFallbackThumb(STUDIO_DUMMY, fallbackThumbUrl));
          setCursor({ dummy: true });
          setLoading(false);
          setError(null);
          return;
        }

        setLoading(false);
        setError(msg);
      }
    },
    [enabled, loading, endpoint, includeSelf, initialLimit, pageSize, cursor, fallbackThumbUrl]
  );

  // initial load / props change
  React.useEffect(() => {
    if (inStudio) {
      setItems(applyFallbackThumb(STUDIO_DUMMY, fallbackThumbUrl));
      setCursor({ dummy: true });
      setLoading(false);
      setError(null);
      return;
    }
    if (!enabled) return;

    setItems([]);
    setCursor(null);
    void fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStudio, enabled, endpoint, includeSelf, initialLimit, fallbackThumbUrl]);

  // IntersectionObserver -> load more
  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;
    if (!enableInfiniteScroll) return;

    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loading) return;
        if (!hasMore) return;
        void fetchPage({ reset: false });
      },
      { root: null, rootMargin: `${Math.max(0, rootMarginPx)}px`, threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [inStudio, enabled, enableInfiniteScroll, rootMarginPx, loading, hasMore, fetchPage]);

  const loadMore = React.useCallback(() => {
    if (loading) return;
    if (!hasMore) return;
    void fetchPage({ reset: false });
  }, [loading, hasMore, fetchPage]);

  const ctx: Ctx = React.useMemo(
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
      {/* ✅ Sentinel wird immer mitgerendert, du musst in Plasmic nichts bauen */}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </DataProvider>
  );
}

export default PhotoCardShell;