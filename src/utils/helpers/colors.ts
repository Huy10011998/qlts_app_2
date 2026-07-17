import { DynamicColorIOS, Platform, PlatformColor } from "react-native";

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
  dark: string,
): string => {
  if (Platform.OS === "ios") {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }

  if (Platform.OS === "android") {
    return PlatformColor(`@color/${resourceName}`) as unknown as string;
  }

  return light;
};

export const C = {
  red: "#E31E24",
  redDeep: "#B91219",
  redLight: "#FF4D52",
  bg: adaptiveColor("app_background", "#F0F2F8", "#09111B"),
  card: adaptiveColor("app_surface", "#FFFFFF", "#151F2C"),
  text: adaptiveColor("app_text", "#0F1923", "#F5F7FB"),
  textSub: adaptiveColor("app_text_sub", "#8A95A3", "#AAB7C8"),
  border: adaptiveColor("app_border", "#EDF0F5", "#273649"),
  blue: "#3B82F6",
  amber: "#F59E0B",
  violet: "#7C3AED",
  emerald: "#10B981",
  rose: "#F43F5E",
  sky: "#0EA5E9",
  surface: adaptiveColor("app_surface", "#FFFFFF", "#151F2C"),
  surfaceAlt: adaptiveColor("app_surface_alt", "#F0F2F6", "#101A27"),
  borderStrong: adaptiveColor("app_border_strong", "#CDD3DE", "#3B4D63"),
  accent: adaptiveColor("app_accent", "#1A3C8F", "#8FB3FF"),
  accentLight: adaptiveColor("app_accent_surface", "#EEF2FB", "#1B2C49"),
  gold: adaptiveColor("app_gold", "#B8942A", "#E2C360"),
  goldLight: adaptiveColor("app_gold_surface", "#FDF6E3", "#352F20"),
  goldBorder: adaptiveColor("app_gold_border", "#E8D48A", "#675A31"),
  textPrimary: adaptiveColor("app_text", "#111827", "#F5F7FB"),
  textSecondary: adaptiveColor(
    "app_text_secondary",
    "#4B5563",
    "#C5D0DE",
  ),
  textMuted: adaptiveColor("app_text_muted", "#9CA3AF", "#8796A9"),
  green: adaptiveColor("app_green", "#059669", "#34D399"),
  greenLight: adaptiveColor("app_green_surface", "#ECFDF5", "#123329"),
  greenBorder: adaptiveColor("app_green_border", "#A7F3D0", "#245A49"),
  redBorder: adaptiveColor("app_red_border", "#FECACA", "#65343B"),
  redSurface: adaptiveColor("app_red_surface", "#FFF3F3", "#321B22"),
  amberLight: adaptiveColor("app_amber_surface", "#FFFBEB", "#382C15"),
  amberBorder: adaptiveColor("app_amber_border", "#FDE68A", "#685624"),
  slate: adaptiveColor("app_slate", "#64748B", "#A7B3C4"),
  slateLight: adaptiveColor("app_slate_surface", "#F8FAFC", "#111C29"),
  slateBorder: adaptiveColor("app_slate_border", "#E2E8F0", "#334459"),
  input: adaptiveColor("app_input", "#FBFCFE", "#0F1A27"),
  placeholder: adaptiveColor("app_placeholder", "#AAB2BC", "#718197"),
  blueSurface: adaptiveColor("app_blue_surface", "#E0F2FE", "#122C42"),
  indigoSurface: adaptiveColor("app_indigo_surface", "#EEF2FF", "#1D2742"),
  violetSurface: adaptiveColor("app_violet_surface", "#F3F0FF", "#292043"),
  violetBorder: adaptiveColor("app_violet_border", "#DDD2FF", "#554778"),
  pinkSurface: adaptiveColor("app_pink_surface", "#FFF0F6", "#371C2F"),
  orangeSurface: adaptiveColor("app_orange_surface", "#FFF7ED", "#382417"),
  tealSurface: adaptiveColor("app_teal_surface", "#CCFBF1", "#11362F"),
  redIconSurface: adaptiveColor("app_red_icon_surface", "#FFE4E4", "#3A1C22"),
  shadow: adaptiveColor("app_shadow", "#1A2340", "#000000"),
  loadingOverlay: adaptiveColor("app_loading_overlay", "#FFFFFFCC", "#151F2CEB"),
  solarHero: adaptiveColor("app_solar_hero", "#A8D8F2", "#10283A"),
  onBrand: "#FFFFFF",
};
