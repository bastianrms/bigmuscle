// components-register/ChatListData.register.ts
import { ChatListData } from "../components/ChatListData";

export function registerChatListData(PLASMIC: any) {
  PLASMIC.registerComponent(ChatListData, {
    name: "ChatListData",
    displayName: "Chat list data (API + Studio dummy)",
    providesData: true,
    importPath: "@/components/ChatListData",
    props: {
      endpoint: {
        type: "string",
        defaultValue: "/api/chat/chatlistquery",
        displayName: "Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "chatList",
        displayName: "Data name",
      },
      children: "slot",
    },
  } as any);
}