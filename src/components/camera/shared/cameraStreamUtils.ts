import { Buffer } from "buffer";
import {
  GO2RTC_HOST,
  TOKEN_REFRESH_THRESHOLD_MS,
} from "./cameraStreamConfig";

export const decodeTokenExpiry = (token: string): number | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const isTokenStillValid = (token: string): boolean => {
  if (!token) return false;

  const exp = decodeTokenExpiry(token);
  if (!exp) return false;

  return exp - Date.now() > TOKEN_REFRESH_THRESHOLD_MS;
};

export const getCameraSnapshotUrl = (
  cameraCode: string,
  timestamp: number,
  extraQuery = "",
) => `${GO2RTC_HOST}/api/frame.jpeg?src=${cameraCode}_snap&t=${timestamp}${extraQuery}`;

export const getCameraHlsUrl = (cameraCode: string) =>
  `${GO2RTC_HOST}/api/stream.m3u8?src=${cameraCode}_main&mp4=flac`;

export const getCameraLayoutLabel = (layoutCount: number) => {
  switch (layoutCount) {
    case 1:
      return "1×1";
    case 4:
      return "2×2";
    case 9:
      return "3×3";
    case 12:
      return "3×4";
    default:
      return "4×4";
  }
};

export const getVisiblePageIndexes = (page: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const maxVisibleDots = 7;
  const half = Math.floor(maxVisibleDots / 2);
  let start = Math.max(0, page - half);
  let end = start + maxVisibleDots - 1;

  if (end >= totalPages) {
    end = totalPages - 1;
    start = Math.max(0, end - maxVisibleDots + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
