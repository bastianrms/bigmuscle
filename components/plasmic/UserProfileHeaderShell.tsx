// components/UserProfileHeaderShell.tsx
import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type UserProfileHeader = {
  user_id: string;
  username: string | null;
  is_online: boolean;
  bio: string | null;
  height_cm: number | null;
  weight_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  bodyfat_percent: number | null;
  country: string | null;
  city: string | null;
  medium_url: string | null;
};

const STUDIO_DUMMY: UserProfileHeader = {
  user_id: "demo-user-123",
  username: "Demo User",
  is_online: true,
  bio: "This is a Studio dummy bio 🙂",
  height_cm: 182,
  weight_cm: 92,
  chest_cm: 118,
  arms_cm: 44,
  waist_cm: 84,
  thigh_cm: 64,
  bodyfat_percent: 12,
  country: "Germany",
  city: "Berlin",
  medium_url:
    "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-medium.webp",
};

export function UserProfileHeaderShell(props: {
  children?: React.ReactNode;
  endpoint?: string; // default: /api/users/UserProfileHeaderQuery
  dataName?: string; // default: userProfileHeader
  userId?: string; // optional: wenn nicht gesetzt, wird aus /users/[user_id] gelesen
}) {
  const {
    children,
    endpoint = "/api/users/UserProfileHeaderQuery",
    dataName = "userProfileHeader",
    userId,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const router = useRouter();
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [profile, setProfile] = React.useState<UserProfileHeader | null>(
    inStudio ? STUDIO_DUMMY : null
  );
  const [error, setError] = React.useState<string | null>(null);

  // Re-fetch bei Route-Wechsel (damit CMS Seiten /users/user_id sauber refreshen)
  React.useEffect(() => {
    if (inStudio) return;

    const bump = () => setRefreshNonce((n) => n + 1);
    router.events.on("routeChangeComplete", bump);

    return () => {
      router.events.off("routeChangeComplete", bump);
    };
  }, [inStudio, router.events]);

  React.useEffect(() => {
    if (inStudio) {
      setProfile(STUDIO_DUMMY);
      setError(null);
      return;
    }

    const fromRoute =
      typeof router.query.user_id === "string"
        ? router.query.user_id
        : typeof router.query.userId === "string"
          ? router.query.userId
          : null;

    const effectiveUserId = userId ?? fromRoute;

    if (!effectiveUserId) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const qs = new URLSearchParams();
    qs.set("user_id", effectiveUserId);

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
      .then((json: unknown) => {
        if (cancelled) return;

        const obj = json as { profile?: UserProfileHeader | null };
        setProfile(obj?.profile ?? null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setProfile(null);
        setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio, userId, router.query.user_id, router.query.userId, refreshNonce]);

  void error;

  return (
    <DataProvider name={dataName} data={profile}>
      {children}
    </DataProvider>
  );
}

export default UserProfileHeaderShell;