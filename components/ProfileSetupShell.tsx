// components/ProfileSetupShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type ProfileSetupCode =
  | "NOT_AUTHENTICATED"
  | "MISSING_USERNAME"
  | "INVALID_USERNAME"
  | "USERNAME_TAKEN"
  | "UNKNOWN";

type SubmitResult = {
  ok: boolean;
  userId: string | null;
  code: ProfileSetupCode | null;
  error: string | null;
};

type ProfileSetupCtx = {
  username: string;
  setUsername: (v: string) => void;

  loading: boolean;
  ok: boolean;
  error: string | null;
  code: ProfileSetupCode | null;

  userId: string | null;

  // ✅ changed: return structured result to avoid race conditions
  submit: () => Promise<SubmitResult>;
  reset: () => void;
};

const STUDIO_DUMMY: ProfileSetupCtx = {
  username: "test_user",
  setUsername: () => {},
  loading: false,
  ok: false,
  error: null,
  code: null,
  userId: "00000000-0000-0000-0000-000000000000",
  submit: async () => ({ ok: true, userId: "00000000-0000-0000-0000-000000000000", code: null, error: null }),
  reset: () => {},
};

export default function ProfileSetupShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string;
  dataName?: string;

  wrapInForm?: boolean;
  formClassName?: string;

  redirectTo?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/auth/profile-setup",
    dataName = "profileSetup",
    wrapInForm = true,
    formClassName,
    redirectTo,
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [username, setUsername] = React.useState("");

  // ✅ sanitize setter: no spaces, no special chars (only letters/numbers/_)
  const setUsernameClean = React.useCallback((v: string) => {
    const cleaned = (v ?? "")
      .replace(/\s+/g, "") // remove any whitespace
      .replace(/[^a-zA-Z0-9_]/g, ""); // keep only allowed chars
    setUsername(cleaned);
  }, []);

  const [loading, setLoading] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [code, setCode] = React.useState<ProfileSetupCode | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setLoading(false);
    setOk(false);
    setError(null);
    setCode(null);
    setUserId(null);
  }, []);

  const submit = React.useCallback(async (): Promise<SubmitResult> => {
    if (!enabled) return { ok: false, userId: null, code: "UNKNOWN", error: "Disabled" };

    // In Studio: don't fetch, but allow UI to proceed
    if (inStudio) {
      return { ok: true, userId: STUDIO_DUMMY.userId, code: null, error: null };
    }

    // important: clear status for this run
    setLoading(true);
    setOk(false);
    setError(null);
    setCode(null);

    const desiredUsername = username.trim();

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: desiredUsername }),
      });

      const txt = await r.text();
      const json = txt
        ? (JSON.parse(txt) as {
            ok?: boolean;
            error?: string;
            code?: ProfileSetupCode;
            userId?: string;
          })
        : {};

      if (!r.ok || !json?.ok) {
        const c = (json?.code ?? "UNKNOWN") as ProfileSetupCode;
        const msg = json?.error || "Profile setup failed";

        setLoading(false);
        setOk(false);
        setError(msg);
        setCode(c);
        setUserId(null);

        return { ok: false, userId: null, code: c, error: msg };
      }

      const newUserId = json?.userId ?? null;

      setUserId(newUserId);
      setOk(true);
      setLoading(false);

      // keep code/error cleared on success
      setError(null);
      setCode(null);

      // ⚠️ optional: if you still want redirect from inside shell
      if (redirectTo) {
        window.location.href = redirectTo;
      }

      // ✅ return userId immediately to avoid race condition in Plasmic run code
      return { ok: true, userId: newUserId, code: null, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      setLoading(false);
      setOk(false);
      setError(msg);
      setCode((prev) => prev ?? "UNKNOWN");
      setUserId(null);

      return { ok: false, userId: null, code: "UNKNOWN", error: msg };
    }
  }, [enabled, inStudio, endpoint, username, redirectTo]);

  const ctx: ProfileSetupCtx = React.useMemo(
    () =>
      inStudio
        ? STUDIO_DUMMY
        : {
            username,
            setUsername: setUsernameClean,
            loading,
            ok,
            error,
            code,
            userId,
            submit,
            reset,
          },
    [inStudio, username, setUsernameClean, loading, ok, error, code, userId, submit, reset]
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