// components/ChatUnreadCountShell.tsx
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
  pollMs?: number;   // default: 30000
};

type GlobalState = {
  intervalId: number | null;
  running: boolean;
  lastCount: number;
  listeners: Set<(count: number) => void>;
  endpoint: string;
  pollMs: number;
};

function getGlobalState(endpoint: string, pollMs: number): GlobalState {
  const w = window as any;

  if (!w.__bmUnreadPoller) {
    w.__bmUnreadPoller = {
      intervalId: null,
      running: false,
      lastCount: 0,
      listeners: new Set(),
      endpoint,
      pollMs,
    } as GlobalState;
  }

  const gs = w.__bmUnreadPoller as GlobalState;

  // keep config in sync (if props change)
  gs.endpoint = endpoint;
  gs.pollMs = pollMs;

  return gs;
}

async function fetchUnread(endpoint: string): Promise<number | "unauth"> {
  const r = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (r.status === 401) return "unauth";

  const txt = await r.text();
  if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

  const json = JSON.parse(txt) as ApiResp;
  return typeof json?.count === "number" ? json.count : 0;
}

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

  const refreshLocal = React.useCallback(async () => {
    if (inStudio) {
      setCount(3);
      setLoading(false);
      return;
    }
    if (!enabled) {
      setCount(0);
      setLoading(false);
      return;
    }
    if (typeof window !== "undefined" && isPublicRoute(window.location.pathname)) {
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchUnread(endpoint);
      if (res === "unauth") {
        setCount(0);
        return;
      }
      setCount(res);
    } catch {
      // keep old count on transient errors (nicht immer 0 setzen)
    } finally {
      setLoading(false);
    }
  }, [enabled, endpoint, inStudio]);

  React.useEffect(() => {
    if (inStudio) return;

    const effectivePollMs = Math.max(30_000, Number.isFinite(pollMs as any) ? pollMs : 30_000);
const gs = getGlobalState(endpoint, effectivePollMs);

    const listener = (c: number) => setCount(c);
    gs.listeners.add(listener);

    // push last known immediately (so UI updates even before first tick)
    setCount(gs.lastCount);

    const stopGlobal = () => {
      if (gs.intervalId) window.clearInterval(gs.intervalId);
      gs.intervalId = null;
      gs.running = false;
    };

    const tick = async () => {
      if (!enabled) {
        gs.lastCount = 0;
        gs.listeners.forEach((fn) => fn(0));
        stopGlobal();
        return;
      }

      // public route => pause (but do not kill forever)
      if (isPublicRoute(window.location.pathname)) {
        gs.lastCount = 0;
        gs.listeners.forEach((fn) => fn(0));
        return;
      }

      try {
        const res = await fetchUnread(gs.endpoint);
        if (res === "unauth") {
          gs.lastCount = 0;
          gs.listeners.forEach((fn) => fn(0));
          stopGlobal(); // stop until auth changes
          return;
        }

        gs.lastCount = res;
        gs.listeners.forEach((fn) => fn(res));
      } catch {
        // transient errors: do nothing (keep lastCount)
      }
    };

    const startGlobal = () => {
      if (gs.running) return;
      gs.running = true;

      // first tick immediately
      void tick();

      // interval
      gs.intervalId = window.setInterval(() => void tick(), gs.pollMs);
    };

    // start
    startGlobal();

    // auth changes => tick now, and restart interval if it was stopped by 401
    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
      const effectivePollMs2 = Math.max(30_000, Number.isFinite(pollMs as any) ? pollMs : 30_000);
const gs2 = getGlobalState(endpoint, effectivePollMs2);
      if (!gs2.running) {
        gs2.running = true;
        void tick();
        gs2.intervalId = window.setInterval(() => void tick(), gs2.pollMs);
      } else {
        void tick();
      }
    });

    // route changes (App Router + pushState): optional manual event you already use
    const onRoute = () => void tick();
    window.addEventListener("bm:routechange", onRoute);

    return () => {
      window.removeEventListener("bm:routechange", onRoute);
      sub?.subscription?.unsubscribe?.();

      gs.listeners.delete(listener);

      if (gs.listeners.size === 0) {
        stopGlobal();
      }
    };
  }, [enabled, endpoint, pollMs, inStudio]);

  const ctx = React.useMemo(
    () => ({ count, loading, refresh: refreshLocal }),
    [count, loading, refreshLocal]
  );

  return <DataProvider name={dataName} data={ctx}>{children}</DataProvider>;
}