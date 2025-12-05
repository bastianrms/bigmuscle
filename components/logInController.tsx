// components/logInController.tsx
import React, { forwardRef, useImperativeHandle } from "react";
import { createClient } from "@supabase/supabase-js";

type Props = {
  // steuert, wohin standardmäßig redirected wird
  redirectTo?: string;

  // States, die von Plasmic verwaltet werden
  hasError?: boolean;
  isLoading?: boolean;
  onHasErrorChange?: (value: boolean) => void;
  onIsLoadingChange?: (value: boolean) => void;
};

// Ref-API, die Plasmic über refActions ansteuert
export type LoginControllerRef = {
  attemptLogin: (args: {
    email: string;
    password: string;
    redirectTo?: string;
  }) => Promise<void>;
};

// Supabase Browser-Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LogInController = forwardRef<LoginControllerRef, Props>(
  function LogInController(props, ref) {
    const {
      onHasErrorChange,
      onIsLoadingChange,
      redirectTo: propRedirectTo,
    } = props;

    useImperativeHandle(
      ref,
      () => ({
        async attemptLogin({ email, password, redirectTo }) {
          const targetRedirect = redirectTo ?? propRedirectTo ?? "/home";

          onIsLoadingChange?.(true);
          onHasErrorChange?.(false);

          try {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              console.error("Login error", error);
              onHasErrorChange?.(true);
              return;
            }

            // Erfolg
            onHasErrorChange?.(false);

            if (typeof window !== "undefined" && targetRedirect) {
              window.location.href = targetRedirect;
            }
          } catch (e) {
            console.error("Unexpected login error", e);
            onHasErrorChange?.(true);
          } finally {
            onIsLoadingChange?.(false);
          }
        },
      }),
      [onHasErrorChange, onIsLoadingChange, propRedirectTo]
    );

    // Kein UI – reine Logik-Komponente
    return null;
  }
);

export default LogInController;