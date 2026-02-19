import UserProfilePhotosGridShell from "../components/UserProfilePhotosGridShell";

export function registerUserProfilePhotosGridShell(PLASMIC: any) {
  PLASMIC.registerComponent(UserProfilePhotosGridShell, {
    name: "UserProfilePhotosGridShell",
    displayName: "User profile photos grid shell (API + Studio dummy)",
    providesData: true,
    importPath: "@/components/UserProfilePhotosGridShell",
    props: {
      endpoint: {
        type: "string",
        defaultValue: "/api/users/UserProfilePhotosGridQuery",
        displayName: "Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "userProfilePhotos",
        displayName: "Data name",
      },
      username: {
        type: "string",
        displayName: "Username (optional; else from route /user/[username])",
      },
      limit: {
        type: "number",
        displayName: "Limit (optional)",
      },
      children: "slot",
    },
  } as any);
}