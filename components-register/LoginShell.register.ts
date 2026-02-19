// components-register/LoginShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import LoginShell from "../components/LoginShell";

export function registerLoginShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(LoginShell, {
    name: "LoginShell",
    importPath: "../components/LoginShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/auth/login" },
      dataName: { type: "string", defaultValue: "login" },
      redirectTo: { type: "string" },

      // ✅ neu
      wrapInForm: { type: "boolean", defaultValue: true },
      formClassName: { type: "class", displayName: "Form class" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerLoginShell;