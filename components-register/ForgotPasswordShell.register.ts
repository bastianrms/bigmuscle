import type { ComponentMeta } from "@plasmicapp/host";
import ForgotPasswordShell from "../components/ForgotPasswordShell";

export function registerForgotPasswordShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(ForgotPasswordShell, {
    name: "ForgotPasswordShell",
    importPath: "../components/ForgotPasswordShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/auth/request-password-reset" },
      dataName: { type: "string", defaultValue: "forgotPassword" },

      wrapInForm: { type: "boolean", defaultValue: false },
      formClassName: { type: "class", displayName: "Form class" },

      redirectTo: { type: "string", defaultValue: "/auth/update-password" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerForgotPasswordShell;