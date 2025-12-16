// components-register/LazyMount.register.ts
import { LazyMount } from "../components/LazyMount";

export function registerLazyMount(PLASMIC: any) {
  PLASMIC.registerComponent(LazyMount, {
    name: "LazyMount",
    displayName: "Lazy mount (conditional)",

    // ✅ Wichtig für plasmic sync / Import-Fixing
importPath: "../components/LayzyMount",

    props: {
      active: {
        type: "boolean",
        displayName: "Mount when true",
        defaultValue: false,
      },
      className: {
        type: "class",
        displayName: "Wrapper class",
      },
      children: {
        type: "slot",
        displayName: "Content",
      },
    },
  } as any);
}