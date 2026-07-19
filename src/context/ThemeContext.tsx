import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedColorScheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const THEME_PREFERENCE_KEY = "@qlts/theme-preference";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const applyThemePreference = (preference: ThemePreference) => {
  Appearance.setColorScheme(preference === "system" ? null : preference);
};

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (!isActive || !isThemePreference(storedPreference)) return;

        setPreferenceState(storedPreference);
        applyThemePreference(storedPreference);
      })
      .catch(() => {
        // Keep the safe default: follow the device appearance.
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    applyThemePreference(nextPreference);
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference).catch(() => {
      // The selected theme remains active for this session even if saving fails.
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedColorScheme:
        preference === "system"
          ? systemColorScheme === "dark"
            ? "dark"
            : "light"
          : preference,
      setPreference,
    }),
    [preference, setPreference, systemColorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemePreference must be used inside ThemeProvider");
  }

  return context;
}
