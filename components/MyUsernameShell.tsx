// components/MyUsernameShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type ApiMeUsername = { ok?: boolean; username?: string | null };

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string; // /api/users/meUsername
  dataName?: string; // myUser
};

type Ctx = {
  username: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const STUDIO_DUMMY: Ctx = {
  username: "mydemo",
  loading: false,
  error: null,
  refresh: () => {},
};

export function MyUsernameShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/meUsername",
    dataName = "myUser",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [username, setUsername] = React.useState<string | null>(inStudio ? "mydemo" : null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;

    if (inStudio) {
      setUsername("mydemo");
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

      const json = JSON.parse(txt) as ApiMeUsername;
      setUsername((json?.username ?? null) as string | null);
      setLoading(false);
    } catch (e: unknown) {
      setUsername(null);
      setLoading(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [enabled, endpoint, inStudio]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const ctx: Ctx = inStudio
    ? STUDIO_DUMMY
    : { username, loading, error, refresh };

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}

export default MyUsernameShell;