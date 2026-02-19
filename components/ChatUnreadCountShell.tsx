"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { supabaseClient } from "@/lib/supabaseClient";
import { isPublicRoute } from "@/lib/publicRoutes";

type ApiResp = { ok?: boolean; count?: number; error?: string };

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default: "/api/chat/unreadCount"
  dataName?: string; // default: "chatUnread"
  pollMs?: number;   // default: 10000
};

export default function ChatUnreadCountShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/chat/unreadCount",
    dataName = "chatUnread",
    pollMs = 30_000,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [count, setCount] = React.useState<number>(inStudio ? 3 : 0);
  const [loading, setLoading] = React.useState(false);

  const timerRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const refresh = React.useCallback(async (): Promise<"keep" | "stop"> => {
    if (!enabled) return "stop";
    if (inStudio) {
      setCount(3);
      setLoading(false);
      return "keep";
    }
    if (typeof window !== "undefined" && isPublicRoute(window.location.pathname)) {
      setCount(0);
      setLoading(false);
      return "stop";
    }

    setLoading(true);
    try {
      const r = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (r.status === 401) {
        setCount(0);
        return "stop";
      }

      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

      const json = JSON.parse(txt) as ApiResp;
      setCount(typeof json?.count === "number" ? json.count : 0);
      return "keep";
    } catch {
      setCount(0);
      return "keep";
    } finally {
      setLoading(false);
    }
  }, [enabled, endpoint, inStudio]);

  const start = React.useCallback(async () => {
    stop();
    const first = await refresh();
    if (first === "stop") return;

    if (pollMs > 0) {
      timerRef.current = window.setInterval(async () => {
        const r = await refresh();
        if (r === "stop") stop();
      }, Math.max(5_000, pollMs));
    }
  }, [pollMs, refresh, stop]);

  React.useEffect(() => {
    if (inStudio) return;

    console.log("[ChatUnreadCountShell] mounted", { enabled, endpoint, pollMs });

    if (!enabled) {
      stop();
      return;
    }

    start();

    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
      start();
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
      stop();
    };
  }, [enabled, endpoint, pollMs, inStudio, start, stop]);

  const ctx = React.useMemo(() => ({ count, loading, refresh }), [count, loading, refresh]);

  return <DataProvider name={dataName} data={ctx}>{children}</DataProvider>;
}