import { PUBLIC_ASSET_BASE_URL } from "../config";

const IMAGE_PATH_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i;

const looksLikeImagePath = (value: string) =>
  value.includes("/") || IMAGE_PATH_PATTERN.test(value);

export const normalizeIconImageUri = (iconMobile?: string | null) => {
  const value = iconMobile?.trim();

  if (!value || !looksLikeImagePath(value)) return undefined;
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.replace(/^\/+/, "");
  return `${PUBLIC_ASSET_BASE_URL}/${normalizedPath}`;
};
