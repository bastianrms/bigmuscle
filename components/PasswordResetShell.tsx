"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type ResetErrorCode =
  | "PASSWORD_MISMATCH"
  | "WEAK_PASSWORD"
  | "NO_SESSION"
  | "UNKNOWN"
  | null;

type PasswordResetCtx = {
  password: string;
  passwordRepeat: string;
  setPassword: (v: string) => void;
  setPasswordRepeat: (v: string) => void;

  loading: boolean;
  ok: boolean;

  error: string | null;
  errorCode: ResetErrorCode;

  message: string | null;

  submit: () => Promise<boolean>;
  reset: () => void;
};

const STUDIO_DUMMY: PasswordResetCtx = {
  password: "••••••••",
  passwordRepeat: "••••••••",
  setPassword: () => {},
  setPasswordRepeat: () => {},
  loading: false,
  ok: false,
  error: null,
  errorCode: null,
  message: null,
  submit: async () => true,
  reset: () => {},
};

export default function PasswordResetShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string;
  dataName?: string;
  redirectTo?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/auth/update-password",
    dataName = "passwordReset",
    redirectTo = "/home",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [password, setPassword] = React.useState("");
  const [passwordRepeat, setPasswordRepeat] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<ResetErrorCode>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
    setErrorCode(null);
    setMessage(null);
  }, []);

  const submit = React.useCallback(async () => {
    if (!enabled || inStudio) return false;

    reset();

    // ✅ client-side mismatch (damit du genau diese Message bekommst)
    if (password !== passwordRepeat) {
      setErrorCode("PASSWORD_MISMATCH");
      setError("Passwords do not match");
      return false;
    }

    setLoading(true);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, passwordRepeat }),
      });

      const txt = await r.text();
      const json = txt ? (JSON.parse(txt) as { ok?: boolean; error?: string }) : {};

      if (!r.ok || !json?.ok) {
        const msg = json?.error || "An error has occurred";

        if (r.status === 401) {
          setErrorCode("NO_SESSION");
          throw new Error("Session expired. Please request a new reset link.");
        }

        if (msg.toLowerCase().includes("at least") || msg.toLowerCase().includes("password")) {
          setErrorCode("WEAK_PASSWORD");
          throw new Error(msg);
        }

        setErrorCode("UNKNOWN");
        throw new Error(msg);
      }

      setOk(true);
      setLoading(false);

      setMessage("New password has been set");

      // optional: mini delay wenn du die success message kurz zeigen willst
      // setTimeout(() => (window.location.href = redirectTo), 600);

      window.location.href = redirectTo;
      return true;
    } catch (e: unknown) {
      setLoading(false);
      setOk(false);
      if (!errorCode) setErrorCode("UNKNOWN");
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [enabled, inStudio, reset, endpoint, password, passwordRepeat, redirectTo, errorCode]);

  const ctx: PasswordResetCtx = React.useMemo(
    () =>
      inStudio
        ? STUDIO_DUMMY
        : {
            password,
            passwordRepeat,
            setPassword,
            setPasswordRepeat,
            loading,
            ok,
            error,
            errorCode,
            message,
            submit,
            reset,
          },
    [inStudio, password, passwordRepeat, loading, ok, error, errorCode, message, submit, reset]
  );

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}