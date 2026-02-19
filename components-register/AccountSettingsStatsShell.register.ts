// components-register/AccountSettingsStatsShell.register.ts
import AccountSettingsStatsShell from "../components/AccountSettingsStatsShell";

export function registerAccountSettingsStatsShell(PLASMIC: any) {
  PLASMIC.registerComponent(AccountSettingsStatsShell, {
    name: "AccountSettingsStatsShell",
    displayName: "Account settings stats shell (load + draft + save)",
    providesData: true,
    importPath: "../components/AccountSettingsStatsShell",
    props: {
      enabled: {
        type: "boolean",
        defaultValue: true,
        displayName: "Enabled",
      },
      endpointGet: {
        type: "string",
        defaultValue: "/api/users/accountSettingsStats",
        displayName: "GET Endpoint",
      },
      endpointPost: {
        type: "string",
        defaultValue: "/api/users/updateStats",
        displayName: "POST Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "accountSettingsStats",
        displayName: "Data name",
      },
      children: "slot",
    },
  } as any);
}