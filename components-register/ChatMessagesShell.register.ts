// components-register/ChatMessagesShell.register.ts
import ChatMessagesShell from "../components/ChatMessagesShell";

export function registerChatMessagesShell(PLASMIC: any) {
  PLASMIC.registerComponent(ChatMessagesShell, {
    name: "ChatMessagesShell",
    displayName: "Chat messages shell (messages + composer)",
    providesData: true,
    importPath: "@/components/ChatMessagesShell", // ✅ wichtig
    props: {
      enabled: {
        type: "boolean",
        defaultValue: true,
        displayName: "Enabled (fetch only when true)",
      },
      endpoint: {
        type: "string",
        defaultValue: "/api/chat/ChatMessagesQuery",
        displayName: "GET Endpoint (messages)",
      },
      sendEndpoint: {
        type: "string",
        defaultValue: "/api/chat/send",
        displayName: "POST Endpoint (send)",
      },
      markAsReadEndpoint: {
        type: "string",
        defaultValue: "/api/chat/markAsRead",
        displayName: "POST Endpoint (mark as read)",
      },
      dataName: {
        type: "string",
        defaultValue: "chatMessages",
        displayName: "Messages data name",
      },
      otherUserDataName: {
        type: "string",
        defaultValue: "chatOtherUser",
        displayName: "Other user data name",
      },
      composerDataName: {
        type: "string",
        defaultValue: "chatComposer",
        displayName: "Composer data name",
      },
      otherUserId: {
        type: "string",
        displayName: "Other user id (optional)",
      },
      otherUsername: {
        type: "string",
        displayName: "Other username (optional; for /inbox/[username])",
      },
      limit: {
        type: "number",
        defaultValue: 30,
        displayName: "Limit",
      },
      children: "slot",
    },
  } as any);
}