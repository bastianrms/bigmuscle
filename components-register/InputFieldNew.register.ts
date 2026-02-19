import type { ComponentMeta } from "@plasmicapp/host";
import InputFieldNew from "../components/InputFieldNew";

export function registerInputFieldNew(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(InputFieldNew, {
    name: "InputFieldNew",
    importPath: "../components/InputFieldNew",
    props: {
      value: { type: "string" },
      defaultValue: { type: "string" },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      },

      placeholder: { type: "string" },

      type: {
        type: "choice",
        options: [
          "text",
          "password",
          "email",
          "number",
          "tel",
          "date",
          "time",
          "datetime-local",
          "hidden",
        ],
        defaultValue: "password",
      },

      inputMode: {
        type: "choice",
        options: ["search", "text", "email", "tel", "url", "none", "numeric", "decimal"],
      },

      disabled: { type: "boolean", defaultValue: false },
      readOnly: { type: "boolean", defaultValue: false },
      required: { type: "boolean", defaultValue: false },

      name: { type: "string" },
      id: { type: "string" },

      min: { type: "string" },
      max: { type: "string" },
      step: { type: "string" },

      showPasswordToggle: { type: "boolean" },
      passwordShownLabel: { type: "string", defaultValue: "Hide password" },
      passwordHiddenLabel: { type: "string", defaultValue: "Show password" },

      onEnter: { type: "eventHandler", argTypes: [] },
      onBlur: { type: "eventHandler", argTypes: [] },
      onFocus: { type: "eventHandler", argTypes: [] },

      rootClassName: { type: "class", displayName: "A. Root wrapper" },
      fieldClassName: { type: "class", displayName: "B. Field wrapper" },
      inputClassName: { type: "class", displayName: "C. Input" },
      rightAddonClassName: { type: "class", displayName: "D. Right addon wrapper" },
      toggleButtonClassName: { type: "class", displayName: "E. Toggle button" },
      iconClassName: { type: "class", displayName: "F. Icon" },
    },
  } as ComponentMeta<unknown>);
}

export default registerInputFieldNew;