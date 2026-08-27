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
 * access token khi cần — vì vậy chỉ được gọi khi user đã đăng nhập. Server tự
 * lấy ID_User từ token, app không gửi kèm.
 *
 * Body: `{ "FcmToken": "…", "Platform": "android" | "ios" }`
 *
 * ⚠️ BE trả `{ "message": "", "data": -1 }` khi thành công — proc bên DB bật
 * SET NOCOUNT ON nên không trả số dòng. Chỉ được coi HTTP 200 là thành công,
 * KHÔNG kiểm giá trị `data`.
 */
export const updateFcmToken = async (
  payload: PushTokenRegistration,
): Promise<void> => {
  if (!PUSH_NOTIFICATION_API_READY) {
    log("[Push] BE chưa sẵn sàng → bỏ qua bước đăng ký token", {
      platform: payload.platform,
      tokenPreview: `${payload.fcmToken.slice(0, 12)}…`,
    });
    return;
  }

  await callApi("POST", API_ENDPOINTS.UPDATE_FCM_TOKEN, {
    FcmToken: payload.fcmToken,
    Platform: payload.platform,
  });
};

/**
 * Tắt token khi logout, để user tiếp theo trên cùng thiết bị không nhận được
 * thông báo của user trước (điện thoại dùng chung — bảo vệ đổi ca).
 *
 * PHẢI gọi TRƯỚC khi xoá access token khỏi máy, vì request cần Authorization.
 *
 * @param fcmToken token của chính máy đang đăng xuất. Bỏ trống sẽ tắt MỌI thiết
 * bị của user — chỉ dùng cho nút riêng "Đăng xuất khỏi mọi thiết bị".
 *
 * BE trả về số thiết bị đã tắt; `data = 0` nghĩa là không còn gì để tắt, KHÔNG
 * phải lỗi. Gọi lại nhiều lần vẫn an toàn.
 */
export const logoutFcmToken = async (fcmToken?: string): Promise<void> => {
  if (!PUSH_NOTIFICATION_API_READY) {
    log("[Push] BE chưa sẵn sàng → bỏ qua bước tắt token");
    return;
  }

  await callApi(
    "POST",
    API_ENDPOINTS.LOGOUT_FCM_TOKEN,
    fcmToken ? { FcmToken: fcmToken } : {},
  );
};
