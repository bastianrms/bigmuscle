// components-register/UsersNowOnlineShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import UsersNowOnlineShell from "../components/UsersNowOnlineShell";

type PlasmicRegister = {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
};

export function registerUsersNowOnlineShell(PLASMIC: PlasmicRegister) {
  PLASMIC.registerComponent(UsersNowOnlineShell, {
    name: "UsersNowOnlineShell",
    importPath: "../components/UsersNowOnlineShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/nowOnline" },
      initialLimit: { type: "number", defaultValue: 6 },
      pageSize: { type: "number", defaultValue: 6 },
      cutoffMinutes: { type: "number", defaultValue: 15 },
      includeSelf: { type: "boolean", defaultValue: false },

      fallbackThumbUrl: {
        type: "string",
        defaultValue:
          "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp",
      },

      dataName: { type: "string", defaultValue: "usersNowOnline" },
      children: {
        type: "slot",
        defaultValue: [{ type: "text", value: "Bind to $ctx.usersNowOnline.items" }],
      },
    },
  });
}

export default registerUsersNowOnlineShell;