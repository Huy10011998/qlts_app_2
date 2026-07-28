import { AppColors, C } from "../../../utils/helpers/colors";

export const HOME_BRAND_RED = C.red;

type HomeCardTheme = {
  bg: string;
  iconBg: string;
  color: string;
  accent: string;
};

export const makeHomeCardTheme = (
  c: AppColors,
): Record<string, HomeCardTheme> => ({
  TaiSan: {
    bg: c.surface,
    iconBg: c.redIconSurface,
    color: c.redLight,
    accent: "#FF6B6B",
  },
  NoiDia: {
    bg: c.surface,
    iconBg: c.tealSurface,
    color: c.emerald,
    accent: "#14B8A6",
  },
  BHLD: {
    bg: c.surface,
    iconBg: c.orangeSurface,
    color: c.amber,
    accent: "#F97316",
  },
  Camera: {
    bg: c.surface,
    iconBg: c.indigoSurface,
    color: c.blue,
    accent: "#748FFC",
  },
  DHCD: {
    bg: c.surface,
    iconBg: c.violetSurface,
    color: c.violet,
    accent: "#8B5CF6",
  },
  default: {
    bg: c.surface,
    iconBg: c.orangeSurface,
    color: c.amber,
    accent: "#FFA94D",
  },
});
