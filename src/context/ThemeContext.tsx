import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance,
  NativeModules,
  Platform,
  useColorScheme,
} from "react-native";

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
  if (Platform.OS === "android") {
    NativeModules.ThemePreference?.setPreference(preference);
  }

  Appearance.setColorScheme(preference === "system" ? null : preference);
};

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (!isActive) return;

        const initialPreference = isThemePreference(storedPreference)
          ? storedPreference
          : "system";

        // Apply the persisted appearance before mounting any screen. Android
        // resolves PlatformColor resources when native views are created; if a
        // screen mounts first, its values/values-night colors can stay cached
        // until the user toggles the appearance again.
        applyThemePreference(initialPreference);
        setPreferenceState(initialPreference);
        setIsHydrated(true);
      })
      .catch(() => {
        if (!isActive) return;

        // Keep the safe default: follow the device appearance, but still
        // release the bootstrap gate when storage cannot be read.
        applyThemePreference("system");
        setIsHydrated(true);
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

  if (!isHydrated) return null;

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
