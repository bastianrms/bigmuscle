// components-register/ToggleSwitch.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import ToggleSwitch from "../components/ToggleSwitch";

export function registerToggleSwitch(PLASMIC: {
  registerComponent: (comp: any, meta: ComponentMeta<any>) => void;
}) {
  PLASMIC.registerComponent(ToggleSwitch, {
    name: "ToggleSwitch",
    displayName: "Toggle switch",
    importPath: "../components/ToggleSwitch",
    props: {
      checked: { type: "boolean", defaultValue: false, displayName: "Checked" },
      disabled: { type: "boolean", defaultValue: false, displayName: "Disabled" },

      trackOffColor: { type: "string", defaultValue: "#d4d4d4", displayName: "Track color (OFF)" },
      trackOnColor: { type: "string", defaultValue: "#22c55e", displayName: "Track color (ON)" },
      thumbColor: { type: "string", defaultValue: "#ffffff", displayName: "Thumb color" },

      widthPx: { type: "number", defaultValue: 56, displayName: "Width (px)" },
      heightPx: { type: "number", defaultValue: 32, displayName: "Height (px)" },
      paddingPx: { type: "number", defaultValue: 2, displayName: "Padding (px)" },
      thumbShadow: { type: "boolean", defaultValue: true, displayName: "Thumb shadow" },

      wrapperClassName: { type: "class", displayName: "A. Wrapper class" },
      trackClassName: { type: "class", displayName: "B. Track class" },
      thumbClassName: { type: "class", displayName: "C. Thumb class" },

      onChange: {
        type: "eventHandler",
        displayName: "On change",
        argTypes: [{ name: "checked", type: "boolean" }],
      },
    },
  });
}

export default registerToggleSwitch;