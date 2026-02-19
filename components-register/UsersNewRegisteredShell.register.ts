// components-register/UsersNewRegisteredShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import UsersNewRegisteredShell from "../components/UsersNewRegisteredShell";

type PlasmicRegister = {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
};

export function registerUsersNewRegisteredShell(PLASMIC: PlasmicRegister) {
  PLASMIC.registerComponent(UsersNewRegisteredShell, {
    name: "UsersNewRegisteredShell",
    importPath: "../components/UsersNewRegisteredShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/newRegistered" },
      initialLimit: { type: "number", defaultValue: 6 },
      pageSize: { type: "number", defaultValue: 6 },
      includeSelf: { type: "boolean", defaultValue: false },

      fallbackThumbUrl: {
        type: "string",
        defaultValue:
          "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp",
      },

      dataName: { type: "string", defaultValue: "usersNewRegistered" },
      children: {
        type: "slot",
        defaultValue: [{ type: "text", value: "Bind to $ctx.usersNewRegistered.items" }],
      },
    },
  });
}

export default registerUsersNewRegisteredShell;