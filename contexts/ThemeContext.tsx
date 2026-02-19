"use client";

import * as React from "react";

const STORAGE_KEY = "bm_theme"; // "light" | "dark"

export type ThemeValue = "light" | "dark";

type ThemeCtx = {
  theme: ThemeValue;
  isDark: boolean;
  setTheme: (t: ThemeValue) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeCtx>({
  theme: "light",
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeValue>("light"); // ✅ default light

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  const setTheme = React.useCallback((t: ThemeValue) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeValue = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}