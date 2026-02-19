// components-register/NavActiveLinkShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import NavActiveLinkShell from "../components/NavActiveLinkShell";

export function registerNavActiveLinkShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(NavActiveLinkShell, {
    name: "NavActiveLinkShell",
    importPath: "../components/NavActiveLinkShell",
    providesData: true,
    props: {
      dataName: { type: "string", defaultValue: "nav" },
      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerNavActiveLinkShell;