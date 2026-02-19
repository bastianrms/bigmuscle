import type { ComponentMeta } from "@plasmicapp/host";
import ChatUnreadCountShell from "../components/ChatUnreadCountShell";

export function registerChatUnreadCountShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(ChatUnreadCountShell, {
    name: "ChatUnreadCountShell",
    importPath: "../components/ChatUnreadCountShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/chat/unreadCount" },
      dataName: { type: "string", defaultValue: "chatUnread" },
      pollMs: { type: "number", defaultValue: 10000, displayName: "Poll (ms)" },
      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerChatUnreadCountShell;