import { StyleSheet } from "react-native";
import { useThemePreference } from "../../context/ThemeContext";

/**
 * Single source of truth for every theme-aware color.
 *
 * Each entry is a tuple `[androidResource, light, dark]`. The Android resource
 * name is kept so `values/values-night` stays in sync for the few surfaces the
 * platform paints itself (window background, splash), but every color consumed
 * from JS is resolved from the light/dark pair below.
 *
 * Colors are deliberately NOT exposed as native adaptive values
 * (`PlatformColor` / `DynamicColorIOS`): Android resolves those once, when the
 * native view is created, so a screen that is already mounted keeps the variant
 * that was active back then. Because the app lets the user override the
 * appearance in Settings, every color has to come from React state instead —
 * see `useAppColors` / `useStyles`.
 */
const ADAPTIVE = {
  bg: ["app_background", "#F0F2F8", "#09111B"],
  card: ["app_surface", "#FFFFFF", "#151F2C"],
  surface: ["app_surface", "#FFFFFF", "#151F2C"],
  surfaceAlt: ["app_surface_alt", "#F0F2F6", "#101A27"],
  text: ["app_text", "#0F1923", "#F5F7FB"],
  textPrimary: ["app_text", "#111827", "#F5F7FB"],
  textSecondary: ["app_text_secondary", "#4B5563", "#C5D0DE"],
  textSub: ["app_text_sub", "#8A95A3", "#AAB7C8"],
  textMuted: ["app_text_muted", "#9CA3AF", "#8796A9"],
  border: ["app_border", "#F3F5F9", "#273649"],
  borderStrong: ["app_border_strong", "#CDD3DE", "#3B4D63"],
  accent: ["app_accent", "#1A3C8F", "#8FB3FF"],
  accentLight: ["app_accent_surface", "#EEF2FB", "#1B2C49"],
  gold: ["app_gold", "#B8942A", "#E2C360"],
  goldLight: ["app_gold_surface", "#FDF6E3", "#352F20"],
  goldBorder: ["app_gold_border", "#E8D48A", "#675A31"],
  green: ["app_green", "#059669", "#34D399"],
  greenLight: ["app_green_surface", "#ECFDF5", "#123329"],
  greenBorder: ["app_green_border", "#A7F3D0", "#245A49"],
  redBorder: ["app_red_border", "#FECACA", "#65343B"],
  redSurface: ["app_red_surface", "#FFF3F3", "#321B22"],
  redIconSurface: ["app_red_icon_surface", "#FFE4E4", "#3A1C22"],
  amberLight: ["app_amber_surface", "#FFFBEB", "#382C15"],
  amberBorder: ["app_amber_border", "#FDE68A", "#685624"],
  slate: ["app_slate", "#64748B", "#A7B3C4"],
  slateLight: ["app_slate_surface", "#F8FAFC", "#111C29"],
  slateBorder: ["app_slate_border", "#E2E8F0", "#334459"],
  input: ["app_input", "#FBFCFE", "#0F1A27"],
  placeholder: ["app_placeholder", "#AAB2BC", "#718197"],
  blueSurface: ["app_blue_surface", "#E0F2FE", "#122C42"],
  indigoSurface: ["app_indigo_surface", "#EEF2FF", "#1D2742"],
  violetSurface: ["app_violet_surface", "#F3F0FF", "#292043"],
  violetBorder: ["app_violet_border", "#DDD2FF", "#554778"],
  pinkSurface: ["app_pink_surface", "#FFF0F6", "#371C2F"],
  orangeSurface: ["app_orange_surface", "#FFF7ED", "#382417"],
  tealSurface: ["app_teal_surface", "#CCFBF1", "#11362F"],
  shadow: ["app_shadow", "#1A2340", "#000000"],
  loadingOverlay: ["app_loading_overlay", "#FFFFFFCC", "#151F2CEB"],
  solarHero: ["app_solar_hero", "#A8D8F2", "#10283A"],
  // Card outline: a faint rule in light, invisible in dark where the surface
  // already separates itself from the background by luminance.
  hairline: ["app_border", "#F3F5F9", "transparent"],
  // Row divider / toolbar rule: must stay visible in both schemes.
  separator: ["app_border", "#EDF0F5", "#273649"],
} as const satisfies Record<string, readonly [string, string, string]>;

/** Brand colors that stay identical across light and dark. */
const BRAND = {
  red: "#E31E24",
  redDeep: "#B91219",
  redLight: "#FF4D52",
  blue: "#3B82F6",
  amber: "#F59E0B",
  violet: "#7C3AED",
  emerald: "#10B981",
  rose: "#F43F5E",
  sky: "#0EA5E9",
  onBrand: "#FFFFFF",
} as const;

type AdaptiveKey = keyof typeof ADAPTIVE;

export type Scheme = "light" | "dark";

/** Every color available to a component, brand + scheme-resolved. */
export type AppColors = Record<AdaptiveKey, string> & typeof BRAND;

/**
 * Brand-only palette. These values are identical in light and dark, so they are
 * the only colors safe to inline in a module-level `StyleSheet.create`.
 * Everything else must come from `useAppColors()` / `useStyles()`.
 */
export const C = BRAND;

const buildScheme = (scheme: Scheme): AppColors => ({
  ...BRAND,
  ...(Object.fromEntries(
    (Object.keys(ADAPTIVE) as AdaptiveKey[]).map((key) => [
      key,
      scheme === "dark" ? ADAPTIVE[key][2] : ADAPTIVE[key][1],
    ]),
  ) as Record<AdaptiveKey, string>),
});

/**
 * Both palettes, built once. The objects are stable per scheme so styles and
 * memoized children keep their identity while the appearance does not change.
 */
export const APP_COLORS: Record<Scheme, AppColors> = {
  light: buildScheme("light"),
  dark: buildScheme("dark"),
};

/** Colors for the appearance currently selected in Settings. */
export const useAppColors = (): AppColors =>
  APP_COLORS[useThemePreference().resolvedColorScheme];

type StyleFactory<T> = (colors: AppColors) => T;

const styleCache = new WeakMap<
  StyleFactory<unknown>,
  Partial<Record<Scheme, unknown>>
>();

/** Run `factory` at most once per (factory, scheme) pair. */
const cached = <T>(factory: StyleFactory<T>, scheme: Scheme): T => {
  let perScheme = styleCache.get(factory as StyleFactory<unknown>);

  if (!perScheme) {
    perScheme = {};
    styleCache.set(factory as StyleFactory<unknown>, perScheme);
  }

  if (!(scheme in perScheme)) {
    perScheme[scheme] = factory(APP_COLORS[scheme]);
  }

  return perScheme[scheme] as T;
};

/**
 * Theme-aware replacement for a module-level `StyleSheet.create`.
 *
 * Pass a factory declared at module scope; the sheet is built once per
 * appearance and cached, so re-renders reuse the same style objects and only an
 * appearance change produces new ones.
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
): T {
  return cached(factory, useThemePreference().resolvedColorScheme);
}

/**
 * Same caching as `useStyles`, for factories that derive plain (non-StyleSheet)
 * theme values such as icon color maps or option lists.
 */
export function useThemeValue<T>(factory: StyleFactory<T>): T {
  return cached(factory, useThemePreference().resolvedColorScheme);
}

/** Card outline — faint in light, invisible in dark. */
export const useHairlineBorderColor = (): string => useAppColors().hairline;

/** Strong border (input / picker outline). */
export const useStrongBorderColor = (): string => useAppColors().borderStrong;

/** Separator line (row divider, toolbar rule) — visible in both schemes. */
export const useSeparatorColor = (): string => useAppColors().separator;

/** Scheme-resolved color for a one-off light/dark pair. */
export const useSchemeColor = (light: string, dark: string): string =>
  useThemePreference().resolvedColorScheme === "dark" ? dark : light;

/** Accent borders (red/green/amber/gold/violet/slate). */
export const useAccentBorderColors = () => {
  const colors = useAppColors();

  return {
    red: colors.redBorder,
    green: colors.greenBorder,
    amber: colors.amberBorder,
    gold: colors.goldBorder,
    violet: colors.violetBorder,
    slate: colors.slateBorder,
  };
};
