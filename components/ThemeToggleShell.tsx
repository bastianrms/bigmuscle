"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  children?: React.ReactNode;
  dataName?: string; // default: "theme"
};

type RefActions = {
  toggleTheme: () => void;
  setLight: () => void;
  setDark: () => void;
};

function ThemeToggleShellBase(props: Props, ref: React.Ref<RefActions>) {
  const { children, dataName = "theme" } = props;
  const inStudio = !!usePlasmicCanvasContext();
  const { isDark, setTheme, toggleTheme } = useTheme();

  React.useImperativeHandle(ref, () => ({
    toggleTheme: () => toggleTheme(),
    setLight: () => setTheme("light"),
    setDark: () => setTheme("dark"),
  }));

  const data = inStudio ? { isDark: false } : { isDark };

  return <DataProvider name={dataName} data={data}>{children}</DataProvider>;
}

export const ThemeToggleShell = React.forwardRef(ThemeToggleShellBase);
export default ThemeToggleShell;