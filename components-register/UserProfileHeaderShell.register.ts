// components-register/UserProfileHeaderShell.register.ts
import UserProfileHeaderShell from "../components/UserProfileHeaderShell";

export function registerUserProfileHeaderShell(PLASMIC: any) {
  PLASMIC.registerComponent(UserProfileHeaderShell, {
    name: "UserProfileHeaderShell",
    displayName: "User profile header shell (API + Studio dummy)",
    providesData: true,
    importPath: "@/components/UserProfileHeaderShell",
    props: {
      endpoint: {
        type: "string",
        defaultValue: "/api/users/UserProfileHeaderQuery",
        displayName: "Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "userProfileHeader",
        displayName: "Data name",
      },

      // Optional overrides (sonst aus Route)
      userId: {
        type: "string",
        displayName: "User id (optional; else from route)",
      },
      username: {
        type: "string",
        displayName: "Username (optional; else from route /user/[username])",
      },

      children: "slot",
    },
  } as any);
}