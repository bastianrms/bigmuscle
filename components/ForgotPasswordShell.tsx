// components/ForgotPasswordShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type ForgotPasswordCtx = {
  email: string;
  setEmail: (v: string) => void;

  loading: boolean;
  ok: boolean;
  error: string | null;

  submit: () => Promise<boolean>;
  reset: () => void;
};

const STUDIO_DUMMY: ForgotPasswordCtx = {
  email: "test@example.com",
  setEmail: () => {},
  loading: false,
  ok: false,
  error: null,
  submit: async () => true,
  reset: () => {},
};

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string; // default /api/auth/request-password-reset
  dataName?: string; // default forgotPassword

  wrapInForm?: boolean; // default false
  formClassName?: string;

  // wohin Supabase am Ende redirecten soll (Confirm-Endpoint + next=...)
  redirectTo?: string; // ✅ string, nicht any
    defaultValue: "/api/auth/passwordResetConfirm?next=/passwordreset",
}

export default function ForgotPasswordShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/auth/request-password-reset",
    dataName = "forgotPassword",
    wrapInForm = false,
    formClassName,
    redirectTo = "/api/auth/passwordResetConfirm?next=/passwordreset",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [email, setEmail] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
  }, []);

  const submit = React.useCallback(async () => {
    if (!enabled || inStudio) return false;

    reset();
    setLoading(true);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), redirectTo }),
      });

      const json = (await r.json()) as { ok?: boolean; error?: string };

      if (!r.ok || !json?.ok) throw new Error(json?.error || "Password reset request failed");

      setOk(true);
      setLoading(false);
      return true;
    } catch (e: unknown) {
      setLoading(false);
      setOk(false);
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [enabled, inStudio, reset, endpoint, email, redirectTo]);

  const ctx: ForgotPasswordCtx = React.useMemo(
    () =>
      inStudio
        ? STUDIO_DUMMY
        : {
            email,
            setEmail,
            loading,
            ok,
            error,
            submit,
            reset,
          },
    [inStudio, email, loading, ok, error, submit, reset]
  );

  const content = wrapInForm ? (
    <form
      className={formClassName}
      onSubmit={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        void submit();
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