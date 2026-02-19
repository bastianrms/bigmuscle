import type { ComponentMeta } from "@plasmicapp/host";
import ThemeToggleShell from "../components/ThemeToggleShell";

export function registerThemeToggleShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(ThemeToggleShell, {
    name: "ThemeToggleShell",
    importPath: "../components/ThemeToggleShell",
    providesData: true,
    props: {
      dataName: { type: "string", defaultValue: "theme" },
      children: "slot",
    },
    refActions: {
      toggleTheme: { displayName: "Toggle theme", argTypes: [] },
      setLight: { displayName: "Set light", argTypes: [] },
      setDark: { displayName: "Set dark", argTypes: [] },
    },
  } as ComponentMeta<unknown>);
}

export default registerThemeToggleShell;