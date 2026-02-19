import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type UserProfilePhotoGridItem = {
  id: string;
  thumb_url: string | null;
  like_count: number | null;
  created_at: string;
};

const DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY: UserProfilePhotoGridItem[] = [
  {
    id: "demo-photo-1",
    thumb_url: DUMMY_THUMB,
    like_count: 98,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-photo-2",
    thumb_url: DUMMY_THUMB,
    like_count: 12,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-photo-3",
    thumb_url: DUMMY_THUMB,
    like_count: 0,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function UserProfilePhotosGridShell(props: {
  children?: React.ReactNode;
  endpoint?: string;   // default: /api/users/UserProfilePhotosGridQuery
  dataName?: string;   // default: userProfilePhotos
  username?: string;   // optional override
  limit?: number;      // optional override (z.B. 6)
}) {
  const {
    children,
    endpoint = "/api/users/UserProfilePhotosGridQuery",
    dataName = "userProfilePhotos",
    username,
    limit,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const router = useRouter();
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [items, setItems] = React.useState<UserProfilePhotoGridItem[]>(
    inStudio ? STUDIO_DUMMY : []
  );
  const [error, setError] = React.useState<string | null>(null);

  // Refresh bei Route-Wechsel
  React.useEffect(() => {
    if (inStudio) return;
    const bump = () => setRefreshNonce((n) => n + 1);
    router.events.on("routeChangeComplete", bump);
    return () => router.events.off("routeChangeComplete", bump);
  }, [inStudio, router.events]);

  React.useEffect(() => {
    if (inStudio) {
      setItems(STUDIO_DUMMY);
      setError(null);
      return;
    }

    const fromRoute =
      typeof router.query.username === "string" ? router.query.username : null;
    const effectiveUsername = (username ?? fromRoute)?.trim() ?? null;

    if (!effectiveUsername) {
      setItems([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const qs = new URLSearchParams();
    qs.set("username", effectiveUsername);
    if (typeof limit === "number") qs.set("limit", String(limit));

    fetch(`${endpoint}?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const next = Array.isArray(json?.items) ? json.items : [];
        setItems(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setItems([]);
        setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio, username, router.query.username, limit, refreshNonce]);

  void error;

  return (
    <DataProvider name={dataName} data={items}>
      {children}
    </DataProvider>
  );
}

export default UserProfilePhotosGridShell;