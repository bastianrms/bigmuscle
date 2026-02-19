// components/LoginShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type LoginCtx = {
  identifier: string;
  password: string;
  loading: boolean;
  ok: boolean;
  error: string | null;

  setIdentifier: (v: string) => void;
  setPassword: (v: string) => void;

  login: () => Promise<void>;
  reset: () => void;
};

const STUDIO_DUMMY: LoginCtx = {
  identifier: "username",
  password: "••••••••",
  loading: false,
  ok: false,
  error: null,
  setIdentifier: () => {},
  setPassword: () => {},
  login: async () => {},
  reset: () => {},
};

export function LoginShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default /api/auth/login
  dataName?: string; // default login
  redirectTo?: string; // optional

  // ✅ neu
  wrapInForm?: boolean; // default true
  formClassName?: string; // optional styling
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/auth/login",
    dataName = "login",
    redirectTo,
    wrapInForm = true,
    formClassName,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
  }, []);

  const login = React.useCallback(async () => {
    if (!enabled || inStudio) return;

    reset();
    setLoading(true);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const txt = await r.text();
      const json = txt ? (JSON.parse(txt) as { ok?: boolean; error?: string }) : {};

      if (!r.ok || !json?.ok) {
        throw new Error(json?.error || "Login failed");
      }

      setOk(true);
      setLoading(false);

      if (redirectTo) window.location.href = redirectTo;
    } catch (e: unknown) {
      setLoading(false);
      setOk(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [enabled, endpoint, identifier, password, inStudio, redirectTo, reset]);

  const ctx: LoginCtx = React.useMemo(
    () =>
      inStudio
        ? STUDIO_DUMMY
        : { identifier, password, loading, ok, error, setIdentifier, setPassword, login, reset },
    [identifier, password, loading, ok, error, login, reset, inStudio]
  );

  const content = wrapInForm ? (
    <form
      className={formClassName}
      // ✅ der entscheidende Teil: verhindert POST auf /
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void login();
      }}
      action="#"
      method="post"
    >
      {children}
    </form>
  ) : (
    <>{children}</>
  );

  return (
    <DataProvider name={dataName} data={ctx}>
      {content}
    </DataProvider>
  );
}

export default LoginShell;