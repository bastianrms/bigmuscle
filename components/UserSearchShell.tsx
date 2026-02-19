// components/UserSearchShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type ApiSearchResponse = {
  ok?: boolean;
  exists?: boolean;
  normalized?: string;
  error?: string;
};

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string; // default: /api/users/search
  dataName?: string; // default: userSearch
  debounceMs?: number; // default 300

  // ✅ neu
  redirectBase?: string; // default: /user/
};

type Ctx = {
  username: string;
  setUsername: (v: string) => void;

  checking: boolean;
  exists: boolean | null;
  notFound: boolean;

  submit: () => Promise<void>;
  reset: () => void;
};

function normalize(v: string) {
  return v.trim().toLowerCase();
}

export function UserSearchShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/search",
    dataName = "userSearch",
    debounceMs = 300,
    redirectBase = "/user/",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [username, setUsernameState] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [exists, setExists] = React.useState<boolean | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const timerRef = React.useRef<number | null>(null);

  const reset = React.useCallback(() => {
    setChecking(false);
    setExists(null);
    setNotFound(false);
  }, []);

  const setUsername = React.useCallback((v: string) => {
    setUsernameState(v);
    setNotFound(false);
  }, []);

  const checkExists = React.useCallback(
    async (nameRaw: string): Promise<boolean> => {
      if (!enabled) return false;

      const name = normalize(nameRaw);

      if (!name) {
        setExists(null);
        setChecking(false);
        return false;
      }

      if (inStudio) {
        setExists(true);
        setChecking(false);
        return true;
      }

      setChecking(true);

      try {
        const qs = new URLSearchParams();
        qs.set("username", name);

        const r = await fetch(`${endpoint}?${qs.toString()}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

        const json = JSON.parse(txt) as ApiSearchResponse;
        const found = !!json?.exists;

        setExists(found);
        setChecking(false);
        return found;
      } catch {
        setExists(null);
        setChecking(false);
        return false;
      }
    },
    [enabled, endpoint, inStudio]
  );

  React.useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      void checkExists(username);
    }, Math.max(0, debounceMs));

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, username, debounceMs, checkExists]);

  const submit = React.useCallback(async () => {
    if (!enabled) return;

    const name = normalize(username);

    if (!name) {
      setNotFound(true);
      setExists(false);
      return;
    }

    const found = await checkExists(name);

    if (found) {
      const base = redirectBase.endsWith("/") ? redirectBase : `${redirectBase}/`;
      window.location.href = `${base}${encodeURIComponent(name)}`;
    } else {
      setNotFound(true);
      setExists(false);
    }
  }, [enabled, username, checkExists, redirectBase]);

  const ctx: Ctx = React.useMemo(
    () => ({
      username,
      setUsername,
      checking,
      exists,
      notFound,
      submit,
      reset,
    }),
    [username, setUsername, checking, exists, notFound, submit, reset]
  );

  return <DataProvider name={dataName} data={ctx}>{children}</DataProvider>;
}

export default UserSearchShell;