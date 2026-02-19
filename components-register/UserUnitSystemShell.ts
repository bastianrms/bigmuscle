// components-register/registerUserUnitSystemShell.ts
import UserUnitSystemShell from "@/components/UserUnitSystemShell";

export function registerUserUnitSystemShell(PLASMIC: any) {
  PLASMIC.registerComponent(UserUnitSystemShell, {
    name: "UserUnitSystemShell",
    displayName: "User unit system shell (GET unit_system + Studio dummy)",
    providesData: true,
    importPath: "@/components/UserUnitSystemShell",
    props: {
      enabled: {
        type: "boolean",
        defaultValue: true,
        displayName: "Enabled",
      },
      endpoint: {
        type: "string",
        defaultValue: "/api/users/unitSystem",
        displayName: "Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "userUnitSystem",
        displayName: "Data name",
      },
      children: "slot",
    },
  } as any);
}