// components/AccountDeleteShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type AccountDeleteCtx = {
  loading: boolean;
  ok: boolean;
  error: string | null;
  deleteAccount: () => Promise<boolean>;
  reset: () => void;
};

export default function AccountDeleteShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string;
  dataName?: string;
  redirectTo?: string; // z.B. "/"
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/users/accountDelete",
    dataName = "accountDelete",
    redirectTo = "/",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
  }, []);

  const deleteAccount = React.useCallback(async () => {
    if (!enabled) return false;
    if (inStudio) return true;

    reset();
    setLoading(true);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const txt = await r.text();
      const json = txt ? (JSON.parse(txt) as { ok?: boolean; error?: string }) : {};

      if (!r.ok || !json?.ok) {
        throw new Error(json?.error || "Account deletion failed");
      }

      setOk(true);
      setLoading(false);

      // Redirect nur bei Erfolg
      window.location.href = redirectTo;
      return true;
    } catch (e: unknown) {
      setLoading(false);
      setOk(false);
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [enabled, inStudio, reset, endpoint, redirectTo]);

  const ctx: AccountDeleteCtx = React.useMemo(
    () => ({ loading, ok, error, deleteAccount, reset }),
    [loading, ok, error, deleteAccount, reset]
  );

  return <DataProvider name={dataName} data={ctx}>{children}</DataProvider>;
}