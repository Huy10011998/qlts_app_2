export const GO2RTC_HOST = "https://api.cholimexfood.com.vn/camera-stream";

export const ANDROID_LIVE_CELL_LIMIT = 4;

export const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

export const LAYOUT_OPTIONS: Record<number, [number, number]> = {
  1: [1, 1],
  4: [2, 2],
  9: [3, 3],
  12: [3, 4],
  16: [4, 4],
};

export const CAMERA_LAYOUT_CHOICES = [1, 4, 9, 12, 16] as const;
