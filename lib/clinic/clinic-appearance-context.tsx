"use client";

/**
 * Injects `--color-clinic-primary` / `--color-clinic-secondary` on `document.documentElement`
 * and syncs `data-theme` + `.dark` for user preference. Initial values come from
 * `getSession()` via `app/(app)/layout.tsx` — `useClinicAppearance` supports optimistic
 * updates for the Settings General tab.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UserPreferencesJson } from "@/types/clinic-settings";

type Theme = UserPreferencesJson["theme"];

type ClinicAppearanceContextValue = {
  /** Effective theme (when `system`, derived from `matchMedia` for DOM). */
  theme: Theme;
  systemPrefersDark: boolean;
  /** True when `theme === "system"` and the OS preference is dark. */
  isDarkEffective: boolean;
  primaryColor: string;
  secondaryColor: string;
  setClinicPrimaryPreview: (hex: string) => void;
  setClinicSecondaryPreview: (hex: string) => void;
  /** Restore CSS vars to the last `syncFromServer` / initial snapshot. */
  resetClinicColorPreview: () => void;
  /** After server save or `router.refresh()`; updates React state and DOM. */
  syncClinicColorsFromServer: (primary: string, secondary: string) => void;
  setThemeClient: (t: Theme) => void;
  /** Re-applies `data-theme` and `.dark` from a preference value (e.g. after `router.refresh()`). */
  syncThemeFromServer: (t: Theme) => void;
};

const ClinicAppearanceContext = createContext<ClinicAppearanceContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  initialTheme: Theme;
  initialPrimary: string;
  initialSecondary: string;
};

function applyClinicColorVars(root: HTMLElement, primary: string, secondary: string) {
  root.style.setProperty("--color-clinic-primary", primary);
  root.style.setProperty("--color-clinic-secondary", secondary);
}

function applyThemeDom(root: HTMLElement, theme: Theme, systemIsDark: boolean) {
  root.setAttribute("data-theme", theme);
  const useDark = theme === "dark" || (theme === "system" && systemIsDark);
  root.classList.toggle("dark", useDark);
}

export function ClinicAppearanceProvider({
  children,
  initialTheme,
  initialPrimary,
  initialSecondary,
}: ProviderProps) {
  const serverSnapshot = useRef({
    primary: initialPrimary,
    secondary: initialSecondary,
    theme: initialTheme,
  });
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    serverSnapshot.current = {
      primary: initialPrimary,
      secondary: initialSecondary,
      theme: initialTheme,
    };
    setPrimaryColor(initialPrimary);
    setSecondaryColor(initialSecondary);
    setTheme(initialTheme);
  }, [initialPrimary, initialSecondary, initialTheme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setSystemPrefersDark(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  const isDarkEffective = useMemo(
    () => theme === "dark" || (theme === "system" && systemPrefersDark),
    [theme, systemPrefersDark]
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    applyClinicColorVars(root, primaryColor, secondaryColor);
  }, [primaryColor, secondaryColor]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    applyThemeDom(root, theme, systemPrefersDark);
  }, [theme, systemPrefersDark]);

  const setClinicPrimaryPreview = useCallback((hex: string) => {
    setPrimaryColor(hex);
  }, []);
  const setClinicSecondaryPreview = useCallback((hex: string) => {
    setSecondaryColor(hex);
  }, []);

  const resetClinicColorPreview = useCallback(() => {
    setPrimaryColor(serverSnapshot.current.primary);
    setSecondaryColor(serverSnapshot.current.secondary);
  }, []);

  const syncClinicColorsFromServer = useCallback((primary: string, secondary: string) => {
    serverSnapshot.current.primary = primary;
    serverSnapshot.current.secondary = secondary;
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  }, []);

  const setThemeClient = useCallback((t: Theme) => {
    setTheme(t);
  }, []);

  const syncThemeFromServer = useCallback((t: Theme) => {
    serverSnapshot.current.theme = t;
    setTheme(t);
  }, []);

  const value = useMemo<ClinicAppearanceContextValue>(
    () => ({
      theme,
      systemPrefersDark,
      isDarkEffective,
      primaryColor,
      secondaryColor,
      setClinicPrimaryPreview,
      setClinicSecondaryPreview,
      resetClinicColorPreview,
      syncClinicColorsFromServer,
      setThemeClient,
      syncThemeFromServer,
    }),
    [
      theme,
      systemPrefersDark,
      isDarkEffective,
      primaryColor,
      secondaryColor,
      setClinicPrimaryPreview,
      setClinicSecondaryPreview,
      resetClinicColorPreview,
      syncClinicColorsFromServer,
      setThemeClient,
      syncThemeFromServer,
    ]
  );

  return (
    <ClinicAppearanceContext.Provider value={value}>{children}</ClinicAppearanceContext.Provider>
  );
}

export function useClinicAppearance(): ClinicAppearanceContextValue {
  const ctx = useContext(ClinicAppearanceContext);
  if (!ctx) {
    throw new Error("useClinicAppearance must be used within ClinicAppearanceProvider.");
  }
  return ctx;
}
