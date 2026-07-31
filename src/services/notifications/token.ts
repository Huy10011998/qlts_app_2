import { Platform } from "react-native";
import {
  getAPNSToken,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
} from "@react-native-firebase/messaging";
import { log, warn } from "../../utils/Logger";
import {
  APNS_TOKEN_MAX_WAIT_MS,
  APNS_TOKEN_POLL_INTERVAL_MS,
} from "./constants";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * iOS: đảm bảo thiết bị đã đăng ký nhận remote message.
 *
 * RNFB tự gọi việc này (messaging_ios_auto_register_for_remote_messages mặc định
 * true), nhưng gọi tường minh giúp luồng không phụ thuộc vào cấu hình ngầm và
 * vẫn đúng nếu sau này có ai tắt cờ đó trong firebase.json.
 */
const ensureRegisteredForRemoteMessages = async () => {
  if (Platform.OS !== "ios") return;

  try {
    if (isDeviceRegisteredForRemoteMessages(getMessaging())) return;
    await registerDeviceForRemoteMessages(getMessaging());
    log("[Push] iOS đã đăng ký nhận remote message");
  } catch (err) {
    warn("[Push] registerDeviceForRemoteMessages thất bại", err);
  }
};

/**
 * iOS: chờ APNs trả device token về.
 *
 * Đây là nguyên nhân phổ biến nhất của lỗi "APNS token has not been set yet" —
 * getToken() gọi quá sớm ngay sau khi user vừa cấp quyền sẽ throw. Poll cho tới
 * khi có token hoặc hết thời gian chờ.
 *
 * @returns true nếu đã có APNs token.
 */
const waitForApnsToken = async (): Promise<boolean> => {
  if (Platform.OS !== "ios") return true;

  const deadline = Date.now() + APNS_TOKEN_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const apnsToken = await getAPNSToken(getMessaging());
      if (apnsToken) {
        log("[Push] Đã có APNs token");
        return true;
      }
    } catch (err) {
      warn("[Push] getAPNSToken lỗi, thử lại", err);
    }

    await sleep(APNS_TOKEN_POLL_INTERVAL_MS);
  }

  // Thường xảy ra trên simulator (không có APNs) hoặc khi thiếu capability
  // Push Notifications / aps-environment trong entitlements.
  warn("[Push] Hết thời gian chờ APNs token");
  return false;
};

/**
 * Lấy FCM token của thiết bị.
 *
 * @returns null nếu chưa lấy được (chưa cấp quyền, chạy simulator, mất mạng…).
 * Caller nên thử lại thay vì coi đây là lỗi vĩnh viễn.
 */
export const fetchFcmToken = async (): Promise<string | null> => {
  try {
    await ensureRegisteredForRemoteMessages();

    const hasApns = await waitForApnsToken();
    if (!hasApns) return null;

    const token = await getToken(getMessaging());

    if (!token) {
      warn("[Push] getToken trả về giá trị rỗng");
      return null;
    }

    log("[Push] Lấy FCM token thành công", {
      preview: `${token.slice(0, 12)}…`,
      length: token.length,
    });

    return token;
  } catch (err) {
    warn("[Push] Lấy FCM token thất bại", err);
    return null;
  }
};
