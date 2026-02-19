import UsersNowOnlineGlobalTriggerShell from "@/components/UsersNowOnlineGlobalTriggerShell";

export function registerUsersNowOnlineGlobalTriggerShell(PLASMIC: any) {
  PLASMIC.registerComponent(UsersNowOnlineGlobalTriggerShell, {
    name: "UsersNowOnlineGlobalTriggerShell",
    displayName: "Users now online global trigger shell (Presence ping)",
    providesData: true,
    importPath: "@/components/UsersNowOnlineGlobalTriggerShell",
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/nowOnlineGlobalTrigger" },
      intervalMs: { type: "number", defaultValue: 60000 },
      dataName: { type: "string", defaultValue: "usersNowOnlineGlobalTrigger" },
      children: { type: "slot", defaultValue: [] },
    },
  } as any);
}

export default registerUsersNowOnlineGlobalTriggerShell;