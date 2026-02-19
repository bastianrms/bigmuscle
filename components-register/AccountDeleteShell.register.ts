import AccountDeleteShell from "@/components/AccountDeleteShell";

export function registerAccountDeleteShell(PLASMIC: any) {
  PLASMIC.registerComponent(AccountDeleteShell, {
    name: "AccountDeleteShell",
    props: {
      children: "slot",
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/users/accountDelete" },
      dataName: { type: "string", defaultValue: "accountDelete" },
      redirectTo: { type: "string", defaultValue: "/" },
    },
    providesData: true,
  });
}