// components-register/ChatMessageInput.register.ts
import { ChatMessageInput } from "../components/ChatMessageInput";

export function registerChatMessageInput(PLASMIC: any) {
  PLASMIC.registerComponent(ChatMessageInput, {
    name: "ChatMessageInput",
    displayName: "Chat message input",
    props: {
      value: {
        type: "string",
        displayName: "Value",
      },
      placeholder: {
        type: "string",
        displayName: "Placeholder",
        defaultValue: "Type a message…",
      },
      onChange: {
        type: "eventHandler",
        displayName: "On change",
        argTypes: [{ name: "value", type: "string" }],
      },
      onEnter: {
        type: "eventHandler",
        displayName: "On Enter (send)",
        argTypes: [], // ✅ Fix
      },

      autoFocus: {
        type: "boolean",
        displayName: "Auto focus",
        defaultValue: false,
      },
      minRows: {
        type: "number",
        displayName: "Min rows",
        defaultValue: 1,
      },
      maxRows: {
        type: "number",
        displayName: "Max rows",
        defaultValue: 5,
      },

      // Styling Props – A/B/C/D
      wrapperClassName: {
        type: "class",
        displayName: "A. Root wrapper",
      },
      outerClassName: {
        type: "class",
        displayName: "B. Outer wrapper",
      },
      innerClassName: {
        type: "class",
        displayName: "C. Inner wrapper",
      },
      textareaClassName: {
        type: "class",
        displayName: "D. Textarea",
      },
    },
  } as any);
}