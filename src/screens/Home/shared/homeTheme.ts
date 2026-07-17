import { C } from "../../../utils/helpers/colors";

export const HOME_BRAND_RED = C.red;
export const HOME_BG = C.bg;

export const HOME_CARD_THEME: Record<
  string,
  { bg: string; iconBg: string; color: string; accent: string }
> = {
  TaiSan: {
    bg: C.surface,
    iconBg: C.redIconSurface,
    color: C.redLight,
    accent: "#FF6B6B",
  },
  NoiDia: {
    bg: C.surface,
    iconBg: C.tealSurface,
    color: C.emerald,
    accent: "#14B8A6",
  },
  BHLD: {
    bg: C.surface,
    iconBg: C.orangeSurface,
    color: C.amber,
    accent: "#F97316",
  },
  Camera: {
    bg: C.surface,
    iconBg: C.indigoSurface,
    color: C.blue,
    accent: "#748FFC",
  },
  DHCD: {
    bg: C.surface,
    iconBg: C.violetSurface,
    color: C.violet,
    accent: "#8B5CF6",
  },
  default: {
    bg: C.surface,
    iconBg: C.orangeSurface,
    color: C.amber,
    accent: "#FFA94D",
  },
};
