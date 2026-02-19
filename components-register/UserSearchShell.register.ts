// components-register/UserSearchShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import UserSearchShell from "../components/UserSearchShell";

export function registerUserSearchShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(UserSearchShell, {
    name: "UserSearchShell",
    importPath: "../components/UserSearchShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/search" },
      dataName: { type: "string", defaultValue: "userSearch" },
      debounceMs: { type: "number", defaultValue: 300, displayName: "Debounce (ms)" },

      // ✅ neu
      redirectBase: { type: "string", defaultValue: "/user/", displayName: "Redirect base" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerUserSearchShell;