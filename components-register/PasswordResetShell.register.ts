import type { ComponentMeta } from "@plasmicapp/host";
import PasswordResetShell from "../components/PasswordResetShell";

export function registerPasswordResetShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(PasswordResetShell, {
    name: "PasswordResetShell",
    importPath: "../components/PasswordResetShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/auth/update-password" },
      dataName: { type: "string", defaultValue: "passwordReset" },
      redirectTo: { type: "string", defaultValue: "/home" },
      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerPasswordResetShell;