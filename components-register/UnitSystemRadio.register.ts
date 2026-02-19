import UnitSystemRadio from "../components/UnitSystemRadio";

export function registerUnitSystemRadio(PLASMIC: any) {
  PLASMIC.registerComponent(UnitSystemRadio, {
    name: "UnitSystemRadio",
    displayName: "Unit system radio (Metric / Imperial)",
    importPath: "../components/UnitSystemRadio",
    props: {
      value: {
        type: "choice",
        displayName: "Value (controlled)",
        options: ["metric", "imperial"],
      },
      defaultValue: {
        type: "choice",
        displayName: "Default value",
        options: ["metric", "imperial"],
        defaultValue: "imperial",
      },
      disabled: {
        type: "boolean",
        displayName: "Disabled",
        defaultValue: false,
      },
      metricLabel: {
        type: "string",
        displayName: "Metric label",
        defaultValue: "Metric",
      },
      imperialLabel: {
        type: "string",
        displayName: "Imperial label",
        defaultValue: "Imperial",
      },
      wrapperId: {
        type: "string",
        displayName: "Wrapper id (optional)",
      },

      onChange: {
        type: "eventHandler",
        displayName: "On change",
        argTypes: [{ name: "value", type: "string" }],
      },

      // Styling (simplified)
      wrapperClassName: { type: "class", displayName: "Wrapper" },
      buttonClassName: { type: "class", displayName: "Button (default)" },
      activeButtonClassName: { type: "class", displayName: "Button (active)" },
      textClassName: { type: "class", displayName: "Text (default)" },
      activeTextClassName: { type: "class", displayName: "Text (active)" },
    },
  } as any);
}