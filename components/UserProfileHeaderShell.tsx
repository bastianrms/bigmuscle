// components/UserProfileHeaderShell.tsx
import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type UserProfileHeader = {
  user_id: string;
  username: string | null;
  is_online: boolean;
  is_self?: boolean;

  bio: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  bodyfat_percent: number | null;
  country: string | null;
  city: string | null;

  medium_url: string | null;
  thumb_url: string | null;
};

const STUDIO_DUMMY: UserProfileHeader = {
  user_id: "demo-user-123",
  username: "yvonne",
  is_online: true,
  is_self: false,
  bio: "This is a Studio dummy bio 🙂",
  height_cm: 182,
  weight_kg: 92,
  chest_cm: 118,
  arms_cm: 44,
  waist_cm: 84,
  thigh_cm: 64,
  bodyfat_percent: 12,
  country: "Germany",
  city: "Berlin",
  medium_url:
    "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-medium.webp",
  thumb_url:
    "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp",
};

export function UserProfileHeaderShell(props: {
  children?: React.ReactNode;
  endpoint?: string;
  dataName?: string;

  // ✅ optional overrides
  username?: string;
  userId?: string;
}) {
  const {
    children,
    endpoint = "/api/users/UserProfileHeaderQuery",
    dataName = "userProfileHeader",
    username,
    userId,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const router = useRouter();
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [profile, setProfile] = React.useState<UserProfileHeader | null>(
    inStudio ? STUDIO_DUMMY : null
  );
  const [error, setError] = React.useState<string | null>(null);

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

    const fromRoute = typeof router.query.username === "string" ? router.query.username : null;

    const effectiveUsername = (username ?? fromRoute)?.trim() ?? null;
    const effectiveUserId = (userId ?? "").trim() || null;

    if (!effectiveUsername && !effectiveUserId) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const qs = new URLSearchParams();
    if (effectiveUsername) qs.set("username", effectiveUsername);
    if (!effectiveUsername && effectiveUserId) qs.set("user_id", effectiveUserId);

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
        setProfile(null);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio, username, userId, router.query.username, refreshNonce]);

  void error;

  return (
    <DataProvider name={dataName} data={profile}>
      {children}
    </DataProvider>
  );
}

export default UserProfileHeaderShell;