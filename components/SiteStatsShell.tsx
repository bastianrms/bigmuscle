// components/SiteStatsShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type SiteStats = {
  total_users: number;
  total_weight_kg: number;
  newest: {
    username: string | null;
    created_at: string | null;
    thumb_url: string | null;
  };
  updated_at: string | null;
};

type ApiResponse = { ok?: boolean; stats?: SiteStats; error?: string };

const STUDIO_DUMMY: SiteStats = {
  total_users: 785,
  total_weight_kg: 24000,
  newest: {
    username: "username",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    thumb_url: null,
  },
  updated_at: new Date().toISOString(),
};

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string; // default: /api/site/stats
  dataName?: string; // default: siteStats
};

type Ctx = {
  stats: SiteStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function SiteStatsShell(props: Props) {
  const { children, enabled = true, endpoint = "/api/site/stats", dataName = "siteStats" } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [stats, setStats] = React.useState<SiteStats | null>(inStudio ? STUDIO_DUMMY : null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;

    if (inStudio) {
      setStats(STUDIO_DUMMY);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

      const json = JSON.parse(txt) as ApiResponse;
      if (!json?.ok || !json?.stats) throw new Error(json?.error || "Failed to load stats");

      setStats(json.stats);
      setLoading(false);
    } catch (e: unknown) {
      setStats(null);
      setLoading(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [enabled, endpoint, inStudio]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const ctx: Ctx = React.useMemo(
    () => ({
      stats,
      loading,
      error,
      refresh,
    }),
    [stats, loading, error, refresh]
  );

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}

export default SiteStatsShell;