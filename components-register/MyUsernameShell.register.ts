// components-register/MyUsernameShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import MyUsernameShell from "../components/MyUsernameShell";

export function registerMyUsernameShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(MyUsernameShell, {
    name: "MyUsernameShell",
    importPath: "../components/MyUsernameShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/meUsername" },
      dataName: { type: "string", defaultValue: "myUser" },
      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerMyUsernameShell;