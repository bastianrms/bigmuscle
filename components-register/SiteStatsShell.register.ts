// components-register/SiteStatsShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import SiteStatsShell from "../components/SiteStatsShell";

export function registerSiteStatsShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(SiteStatsShell, {
    name: "SiteStatsShell",
    importPath: "../components/SiteStatsShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/site/stats" },
      dataName: { type: "string", defaultValue: "siteStats" },
      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerSiteStatsShell;