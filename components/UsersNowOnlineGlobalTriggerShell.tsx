"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { supabaseClient } from "@/lib/supabaseClient";
import { isPublicRoute } from "@/lib/publicRoutes";

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default: "/api/users/nowOnlineGlobalTrigger"
  intervalMs?: number; // default: 60000
  dataName?: string; // default: "usersNowOnlineGlobalTrigger"
};

function installHistoryListener() {
  if (typeof window === "undefined") return () => {};

  const w = window as unknown as { __bm_history_listener_installed?: boolean };
  if (w.__bm_history_listener_installed) return () => {};
  w.__bm_history_listener_installed = true;

  const fire = () => window.dispatchEvent(new Event("bm:routechange"));

  const origPush = history.pushState.bind(history);
  history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const ret = origPush(...args);
    fire();
    return ret;
  }) as History["pushState"];

  const origReplace = history.replaceState.bind(history);
  history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const ret = origReplace(...args);
    fire();
    return ret;
  }) as History["replaceState"];

  window.addEventListener("popstate", fire);
  return () => window.removeEventListener("popstate", fire);
}

export default function UsersNowOnlineGlobalTriggerShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/nowOnlineGlobalTrigger",
    intervalMs = 60_000,
    dataName = "usersNowOnlineGlobalTrigger",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [running, setRunning] = React.useState(false);
  const [lastOkAt, setLastOkAt] = React.useState<string | null>(null);
  const [lastErr, setLastErr] = React.useState<string | null>(null);

  const timerRef = React.useRef<number | null>(null);
  const startingRef = React.useRef(false);

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const pingOnce = React.useCallback(async (): Promise<"keep" | "stop"> => {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (resp.status === 401) {
        setLastErr("401 Not authenticated");
        return "stop";
      }

      if (!resp.ok) {
        const txt = await resp.text();
        setLastErr(txt || `HTTP ${resp.status}`);
        return "keep";
      }

      const json: unknown = await resp.json();

      const lastActiveAt =
        typeof (json as { last_active_at?: unknown } | null)?.last_active_at === "string"
          ? (json as { last_active_at: string }).last_active_at
          : new Date().toISOString();

      setLastErr(null);
      setLastOkAt(lastActiveAt);
      return "keep";
    } catch (e: unknown) {
      setLastErr(e instanceof Error ? e.message : String(e));
      return "keep";
    }
  }, [endpoint]);

  const start = React.useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      stop();

      if (typeof window === "undefined") return;

      // Block public routes
      if (isPublicRoute(window.location.pathname)) {
        return;
      }

      setRunning(true);

      const first = await pingOnce();
      if (first === "stop") {
        stop();
        return;
      }

      timerRef.current = window.setInterval(async () => {
        const r = await pingOnce();
        if (r === "stop") stop();
      }, Math.max(10_000, intervalMs));
    } finally {
      startingRef.current = false;
    }
  }, [intervalMs, pingOnce, stop]);

  React.useEffect(() => {
    if (inStudio) return;

    console.log("[UsersNowOnlineGlobalTriggerShell] mounted", {
      enabled,
      endpoint,
      intervalMs,
    });

    if (!enabled) {
      stop();
      return;
    }

    const uninstallHistory = installHistoryListener();

    const scheduleStart = () => {
      window.setTimeout(() => {
        void start();
      }, 0);
    };

    scheduleStart();
    window.addEventListener("bm:routechange", scheduleStart);

    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
      scheduleStart();
    });

    return () => {
      window.removeEventListener("bm:routechange", scheduleStart);
      uninstallHistory?.();
      sub?.subscription?.unsubscribe?.();
      stop();
    };
  }, [enabled, endpoint, intervalMs, inStudio, start, stop]);

  const ctxValue = React.useMemo(
    () => ({ running, lastOkAt, lastErr }),
    [running, lastOkAt, lastErr]
  );

  return (
    <DataProvider name={dataName} data={ctxValue}>
      {children}
    </DataProvider>
  );
}