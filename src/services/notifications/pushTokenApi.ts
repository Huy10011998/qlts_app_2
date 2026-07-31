import {
  API_ENDPOINTS,
  PUSH_NOTIFICATION_API_READY,
} from "../../config/index";
import { log } from "../../utils/Logger";
import { callApi } from "../data/httpClient";
import type { PushTokenRegistration } from "./types";

/**
 * Gửi FCM token lên BE để map token ↔ user đang đăng nhập.
 *
 * Request đi qua `callApi` nên tự động mang Authorization header và tự refresh
 * access token khi cần — vì vậy chỉ được gọi khi user đã đăng nhập.
 *
 * Body:
 * ```json
 * {
 *   "token": "<FCM registration token>",
 *   "platform": "android" | "ios",
 *   "deviceId": "…",
 *   "deviceName": "iPhone 15 Pro",
 *   "osVersion": "18.2",
 *   "appVersion": "2.28",
 *   "buildNumber": "53"
 * }
 * ```
 */
export const registerDeviceToken = async (
  payload: PushTokenRegistration,
): Promise<void> => {
  if (!PUSH_NOTIFICATION_API_READY) {
    log("[Push] BE chưa sẵn sàng → bỏ qua bước đăng ký token", {
      platform: payload.platform,
      deviceId: payload.deviceId,
      tokenPreview: `${payload.token.slice(0, 12)}…`,
    });
    return;
  }

  await callApi("POST", API_ENDPOINTS.REGISTER_DEVICE_TOKEN, payload);
};

/**
 * Huỷ map token ↔ user khi logout, để user tiếp theo trên cùng thiết bị không
 * nhận được thông báo của user trước.
 *
 * Body: `{ "token": "<FCM registration token>" }`
 */
export const unregisterDeviceToken = async (token: string): Promise<void> => {
  if (!PUSH_NOTIFICATION_API_READY) {
    log("[Push] BE chưa sẵn sàng → bỏ qua bước huỷ đăng ký token");
    return;
  }

  await callApi("POST", API_ENDPOINTS.UNREGISTER_DEVICE_TOKEN, { token });
};
