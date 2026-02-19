// components-register/ProfileSetupShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import ProfileSetupShell from "../components/ProfileSetupShell";

export function registerProfileSetupShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(ProfileSetupShell, {
    name: "ProfileSetupShell",
    importPath: "../components/ProfileSetupShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/auth/profile-setup" },
      dataName: { type: "string", defaultValue: "profileSetup" },

      wrapInForm: { type: "boolean", defaultValue: true },
      formClassName: { type: "class", displayName: "Form class" },

      redirectTo: { type: "string" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerProfileSetupShell;