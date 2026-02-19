"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type UnitSystem = "metric" | "imperial";

type ApiResponse =
  | { ok: true; unitSystem: UnitSystem }
  | { ok: false; error: string };

type Ctx = {
  unitSystem: UnitSystem;
  isMetric: boolean;
  isImperial: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const STUDIO_DUMMY: Ctx = {
  unitSystem: "imperial",
  isMetric: false,
  isImperial: true,
  loading: false,
  error: null,
  refresh: async () => {},
};

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default: "/api/users/unitSystem"
  dataName?: string; // default: "userUnitSystem"
};

function normalizeUnitSystem(v: unknown): UnitSystem {
  return v === "metric" ? "metric" : "imperial";
}

function readUnitFromClientCache(): UnitSystem | null {
  if (typeof window === "undefined") return null;

  const w = (window as unknown as { __bmUnitSystem?: unknown }).__bmUnitSystem;
  if (w === "metric" || w === "imperial") return w;

  try {
    const ls = window.localStorage.getItem("bm:unitSystem");
    if (ls === "metric" || ls === "imperial") return ls;
  } catch {
    // ignore
  }

  return null;
}

function writeUnitToClientCache(next: UnitSystem) {
  if (typeof window === "undefined") return;

  (window as unknown as { __bmUnitSystem?: UnitSystem }).__bmUnitSystem = next;

  try {
    window.localStorage.setItem("bm:unitSystem", next);
  } catch {
    // ignore
  }
}

export default function UserUnitSystemShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/unitSystem",
    dataName = "userUnitSystem",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [unitSystem, setUnitSystem] = React.useState<UnitSystem>(() => {
    if (inStudio) return STUDIO_DUMMY.unitSystem;
    return readUnitFromClientCache() ?? "imperial";
  });

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;

    if (inStudio) {
      setUnitSystem(STUDIO_DUMMY.unitSystem);
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

      const json = (await r.json()) as ApiResponse;

      if (!r.ok || !json.ok) {
        throw new Error(
          "error" in json && json.error ? json.error : `HTTP ${r.status}`
        );
      }

      const next = normalizeUnitSystem(json.unitSystem);
      writeUnitToClientCache(next);
      setUnitSystem(next);

      setLoading(false);
    } catch (e: unknown) {
      setLoading(false);
      setError(e instanceof Error ? e.message : String(e));

      // keep whatever we had; do not force imperial here
      const cached = readUnitFromClientCache();
      if (cached) setUnitSystem(cached);
    }
  }, [enabled, endpoint, inStudio]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // ✅ react immediately to Account Settings switch (and keep caches in sync)
  React.useEffect(() => {
    if (inStudio) return;

    const onChanged = (ev: Event) => {
      if (ev instanceof CustomEvent) {
        const detail = ev.detail as unknown;
        const next = (detail as { unitSystem?: unknown } | null)?.unitSystem;

        if (next === "metric" || next === "imperial") {
          writeUnitToClientCache(next);
          setUnitSystem(next);
          return;
        }
      }

      void refresh();
    };

    window.addEventListener("bm:unitSystemChanged", onChanged);
    return () => window.removeEventListener("bm:unitSystemChanged", onChanged);
  }, [inStudio, refresh]);

  // ✅ ensure window cache is always aligned with state (no event dispatch here to avoid loops)
  React.useEffect(() => {
    if (inStudio) return;
    writeUnitToClientCache(unitSystem);
  }, [unitSystem, inStudio]);

  const ctx: Ctx = React.useMemo(() => {
    if (inStudio) return STUDIO_DUMMY;
    return {
      unitSystem,
      isMetric: unitSystem === "metric",
      isImperial: unitSystem === "imperial",
      loading,
      error,
      refresh,
    };
  }, [inStudio, unitSystem, loading, error, refresh]);

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}