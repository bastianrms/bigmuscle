// components-register/UserCardShell.register.ts
import UserCardShell from "../components/UserCardShell";

export function registerUserCardShell(PLASMIC: any) {
  PLASMIC.registerComponent(UserCardShell, {
    name: "UserCardShell",
    displayName: "User card shell (generic list + viewer unit + fallback thumb)",
    providesData: true,
    importPath: "@/components/UserCardShell",
    props: {
      enabled: {
        type: "boolean",
        defaultValue: true,
        displayName: "Enabled",
      },
      endpoint: {
        type: "string",
        defaultValue: "/api/users/nowOnline",
        displayName: "Endpoint (GET)",
      },
      initialLimit: {
        type: "number",
        defaultValue: 6,
        displayName: "Initial limit",
      },
      pageSize: {
        type: "number",
        defaultValue: 6,
        displayName: "Page size (load more)",
      },
      includeSelf: {
        type: "boolean",
        defaultValue: false,
        displayName: "Include self",
      },

      // ✅ NEW: viewer unit system (bind this to $ctx.userUnitSystem?.unitSystem)
      unitSystem: {
        type: "choice",
        options: ["metric", "imperial"],
        displayName: "Viewer unit system (optional)",
      },

      dataName: {
        type: "string",
        defaultValue: "userCards",
        displayName: "Data name",
      },
      fallbackThumbUrl: {
        type: "string",
        displayName: "Fallback thumb URL",
      },
      studioDummyCount: {
        type: "number",
        defaultValue: 6,
        displayName: "Studio dummy count",
      },
      studioDummyThumbUrl: {
        type: "string",
        displayName: "Studio dummy thumb URL",
      },
      children: "slot",
    },
  } as any);
}

export default registerUserCardShell;