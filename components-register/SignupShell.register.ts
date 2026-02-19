// components-register/SignupShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import SignupShell from "../components/SignupShell";

export function registerSignupShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(SignupShell, {
    name: "SignupShell",
    importPath: "../components/SignupShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/auth/signup" },
      dataName: { type: "string", defaultValue: "signup" },

      // link target AFTER email click (supabase email confirmation redirect)
      emailRedirectTo: { type: "string" },

      // ✅ NEW: redirect right after successful submit
      redirectTo: { type: "string" },

      wrapInForm: { type: "boolean", defaultValue: true },
      formClassName: { type: "class", displayName: "Form class" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerSignupShell;