import { Buffer } from "buffer";
import { GO2RTC_HOST, TOKEN_REFRESH_THRESHOLD_MS } from "./cameraStreamConfig";

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

/**
 * Nguồn go2rtc để lấy ảnh JPEG.
 *
 * `snap` là luồng phụ: ảnh nhẹ, về nhanh, hợp cho thumbnail trong danh sách và
 * lưới. `main` là chính luồng mà fullscreen phát.
 */
export type CameraSnapshotSource = "snap" | "main";

// test _snap -> sub
export const getCameraSnapshotUrl = (
  cameraCode: string,
  timestamp: number,
  extraQuery = "",
  source: CameraSnapshotSource = "snap",
) =>
  `${GO2RTC_HOST}/api/frame.jpeg?src=${cameraCode}_${source}&t=${timestamp}${extraQuery}`;

/**
 * Ảnh chờ trong lúc stream fullscreen đang load.
 *
 * Phải lấy từ `_main` — đúng luồng mà fullscreen sắp phát — chứ không phải
 * `_snap`. Hai luồng của cùng một đầu ghi không bắt buộc cùng tỷ lệ khung hình
 * (luồng phụ thường để D1 4:3 trong khi luồng chính 16:9); fullscreen lại vẽ
 * kiểu `contain`, nên ảnh chờ lệch tỷ lệ sẽ hụt hai bên rồi "nhảy" ra full ngay
 * lúc video hiện lên. Cùng nguồn thì cùng khuôn, không phụ thuộc đầu ghi được
 * cấu hình thế nào.
 */
export const getCameraFullscreenSnapshotUrl = (
  cameraCode: string,
  timestamp: number,
) => getCameraSnapshotUrl(cameraCode, timestamp, "", "main");

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
