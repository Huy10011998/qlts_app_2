import { useThemePreference } from "../context/ThemeContext";

/** App-level scheme resolved from the persisted in-app preference. */
export function useColorScheme(): "light" | "dark" {
  return useThemePreference().resolvedColorScheme;
}
