import { DynamicColorIOS, Platform, PlatformColor } from "react-native";
import { useThemePreference } from "../../context/ThemeContext";

/**
 * A native adaptive color. Android resolves the value from values/values-night,
 * while iOS keeps both variants and updates it with the current appearance.
 *
 * The cast keeps the existing public API compatible with components in this
 * project which historically typed colors as strings. React Native accepts the
 * opaque native color value at runtime.
 */
export const adaptiveColor = (
  resourceName: string,
  light: string,
  dark: string
): string => {
  if (Platform.OS === "ios") {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }

  if (Platform.OS === "android") {
    return PlatformColor(`@color/${resourceName}`) as unknown as string;
  }

  return light;
};

/**
 * Single source of truth for every theme-aware color.
 *
 * Each entry is a tuple `[androidResource, light, dark]`. `C` derives the
 * native adaptive value from it, `APP_COLORS`/`useAppColors` derive the concrete
 * JS light+dark values from it, and the border hooks pick a variant from it.
 * Keep new colors here so a value is never hand-copied across those consumers.
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
type Scheme = "light" | "dark";

const schemeValue = (
  def: readonly [string, string, string],
  scheme: Scheme
): string => (scheme === "dark" ? def[2] : def[1]);

const adaptiveEntries = (Object.keys(ADAPTIVE) as AdaptiveKey[]).map((key) => {
  const [resource, light, dark] = ADAPTIVE[key];
  return [key, adaptiveColor(resource, light, dark)] as const;
});

export const C = {
  ...BRAND,
  ...(Object.fromEntries(adaptiveEntries) as Record<AdaptiveKey, string>),
};

const buildScheme = (scheme: Scheme) =>
  Object.fromEntries(
    (Object.keys(ADAPTIVE) as AdaptiveKey[]).map((key) => [
      key,
      schemeValue(ADAPTIVE[key], scheme),
    ])
  ) as Record<AdaptiveKey, string>;

const APP_COLORS: Record<Scheme, Record<AdaptiveKey, string>> = {
  light: buildScheme("light"),
  dark: buildScheme("dark"),
};

/**
 * Concrete JS colors for views that must update immediately when the user
 * changes the in-app appearance. Android PlatformColor values can keep the
 * resource variant that was active when a StyleSheet was created.
 */
export const useAppColors = () => {
  const { resolvedColorScheme } = useThemePreference();
  return APP_COLORS[resolvedColorScheme];
};

/**
 * Border color resolved in JS instead of via native adaptive color: on the
 * iOS new architecture, borderColor can stay stuck on the light variant when
 * the app overrides the appearance at runtime (Appearance.setColorScheme).
 */
export const useHairlineBorderColor = (): string => {
  const { resolvedColorScheme } = useThemePreference();
  return resolvedColorScheme === "dark" ? "transparent" : ADAPTIVE.border[1];
};

/**
 * Strong border (input/picker outline) resolved in JS for the same reason as
 * useHairlineBorderColor — must stay visible in dark, just with the dark tint.
 */
export const useStrongBorderColor = (): string => {
  const { resolvedColorScheme } = useThemePreference();
  return schemeValue(ADAPTIVE.borderStrong, resolvedColorScheme);
};

/**
 * Separator line (row divider, toolbar rule) resolved in JS — must stay
 * visible in dark, unlike the hairline card outline.
 */
export const useSeparatorColor = (): string => {
  const { resolvedColorScheme } = useThemePreference();
  return resolvedColorScheme === "dark" ? ADAPTIVE.border[2] : "#EDF0F5";
};

/**
 * Generic scheme-resolved color for border props that need a custom pair
 * (accent borders such as red/violet badges).
 */
export const useSchemeColor = (light: string, dark: string): string => {
  const { resolvedColorScheme } = useThemePreference();
  return resolvedColorScheme === "dark" ? dark : light;
};

/**
 * Accent borders (red/green/amber/gold/violet/slate) resolved in JS — same
 * Fabric limitation as the hooks above; values mirror the C.*Border pairs.
 */
export const useAccentBorderColors = () => {
  const { resolvedColorScheme } = useThemePreference();
  const scheme = resolvedColorScheme;
  return {
    red: schemeValue(ADAPTIVE.redBorder, scheme),
    green: schemeValue(ADAPTIVE.greenBorder, scheme),
    amber: schemeValue(ADAPTIVE.amberBorder, scheme),
    gold: schemeValue(ADAPTIVE.goldBorder, scheme),
    violet: schemeValue(ADAPTIVE.violetBorder, scheme),
    slate: schemeValue(ADAPTIVE.slateBorder, scheme),
  };
};
