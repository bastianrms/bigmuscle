// components/SignupShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type SignupErrorCode =
  | "EMAIL_TAKEN"
  | "PASSWORD_MISMATCH"
  | "INVALID_EMAIL"
  | "MISSING_FIELDS"
  | "WEAK_PASSWORD"
  | "UNKNOWN";

type SignupCtx = {
  email: string;
  password: string;
  passwordRepeat: string;

  loading: boolean;
  ok: boolean;
  error: string | null;
  errorCode: SignupErrorCode | null;

  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setPasswordRepeat: (v: string) => void;

  signup: () => Promise<void>;
  reset: () => void;
};

const STUDIO_DUMMY: SignupCtx = {
  email: "test@example.com",
  password: "••••••••",
  passwordRepeat: "••••••••",
  loading: false,
  ok: false,
  error: null,
  errorCode: null,
  setEmail: () => {},
  setPassword: () => {},
  setPasswordRepeat: () => {},
  signup: async () => {},
  reset: () => {},
};

export function SignupShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string; // default /api/auth/signup
  dataName?: string; // default signup

  emailRedirectTo?: string; // link target AFTER email click
  redirectTo?: string; // ✅ NEW: redirect AFTER successful submit

  wrapInForm?: boolean; // default true
  formClassName?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/auth/signup",
    dataName = "signup",
    emailRedirectTo,
    redirectTo, // ✅ NEW
    wrapInForm = true,
    formClassName,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordRepeat, setPasswordRepeat] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<SignupErrorCode | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
    setErrorCode(null);
  }, []);

  const signup = React.useCallback(async () => {
    if (!enabled || inStudio) return;

    reset();

    const e = email.trim().toLowerCase();

    if (!e || !password || !passwordRepeat) {
      setErrorCode("MISSING_FIELDS");
      setError("Please fill in all fields");
      return;
    }

    if (password !== passwordRepeat) {
      setErrorCode("PASSWORD_MISMATCH");
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: e,
          password,
          passwordRepeat,
          emailRedirectTo,
        }),
      });

      const txt = await r.text();
      const json = txt
        ? (JSON.parse(txt) as { ok?: boolean; error?: string; code?: SignupErrorCode })
        : {};

      if (!r.ok || !json?.ok) {
        setErrorCode(json?.code ?? "UNKNOWN");
        throw new Error(json?.error || "Signup failed");
      }

      setOk(true);
      setLoading(false);

      // ✅ redirect right after submit success
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    } catch (e: unknown) {
      setLoading(false);
      setOk(false);
      setError(e instanceof Error ? e.message : String(e));
      setErrorCode((prev) => prev ?? "UNKNOWN");
    }
  }, [enabled, inStudio, reset, email, password, passwordRepeat, endpoint, emailRedirectTo, redirectTo]);

  const ctx: SignupCtx = React.useMemo(
    () =>
      inStudio
        ? STUDIO_DUMMY
        : {
            email,
            password,
            passwordRepeat,
            loading,
            ok,
            error,
            errorCode,
            setEmail,
            setPassword,
            setPasswordRepeat,
            signup,
            reset,
          },
    [email, password, passwordRepeat, loading, ok, error, errorCode, signup, reset, inStudio]
  );

  const content = wrapInForm ? (
    <form
      className={formClassName}
      onSubmit={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        void signup();
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

export default SignupShell;