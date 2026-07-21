import { C } from "./colors";

/**
 * Design tokens: a small, shared scale for spacing, radius and typography so
 * screens stop hand-picking one-off values. Prefer these over raw numbers in
 * new/refactored StyleSheets.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  caption: 11,
  small: 13,
  body: 14,
  subhead: 16,
  title: 20,
  hero: 32,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

type ElevationLevel = 1 | 2 | 3;

const ELEVATION_SPECS: Record<
  ElevationLevel,
  { shadowOpacity: number; shadowRadius: number; elevation: number }
> = {
  1: { shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  2: { shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  3: { shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
};

/**
 * Card/surface shadow. Replaces the near-identical `CARD_SHADOW` objects that
 * were copied per feature — they differed only by opacity/radius, now levels.
 */
export const elevation = (level: ElevationLevel = 1) => ({
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: 2 },
  ...ELEVATION_SPECS[level],
});
