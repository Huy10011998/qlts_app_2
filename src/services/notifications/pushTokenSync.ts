import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DeviceInfo from "react-native-device-info";
import { log, warn } from "../../utils/Logger";
import {
  PUSH_REGISTRATION_CACHE_KEY,
  REGISTER_RETRY_DELAYS_MS,
} from "./constants";
import { ensureNotificationPermission } from "./permissions";
import { logoutFcmToken, updateFcmToken } from "./pushTokenApi";
import { fetchFcmToken } from "./token";
import type {
  PushPlatform,
  PushRegistrationCache,
  PushTokenRegistration,
} from "./types";

/** Chống chạy song song nhiều lần sync (foreground + reconnect + token refresh). */
let syncPromise: Promise<void> | null = null;

/** Token đã lấy được ở phiên hiện tại — cần giữ để gọi unregister lúc logout. */
let activeToken: string | null = null;

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const readCache = async (): Promise<PushRegistrationCache | null> => {
  try {
    const raw = await AsyncStorage.getItem(PUSH_REGISTRATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PushRegistrationCache;
    return typeof parsed?.token === "string" ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = async (cache: PushRegistrationCache) => {
  try {
    await AsyncStorage.setItem(
      PUSH_REGISTRATION_CACHE_KEY,
      JSON.stringify(cache),
    );
  } catch (err) {
    // Không throw: mất cache chỉ làm app gửi lại token ở lần mở sau, không sai.
    warn("[Push] Lưu cache đăng ký token thất bại", err);
  }
};

const clearCache = async () => {
  try {
    await AsyncStorage.removeItem(PUSH_REGISTRATION_CACHE_KEY);
  } catch (err) {
    warn("[Push] Xoá cache đăng ký token thất bại", err);
  }
};

const buildRegistration = (token: string): PushTokenRegistration => ({
  fcmToken: token,
  platform: Platform.OS as PushPlatform,
});

/**
 * Phiên bản app hiện tại — nằm trong cache để lần cập nhật app nào cũng gửi lại
 * token một lượt, kể cả khi token không đổi.
 */
const readAppVersion = () => {
  try {
    return {
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
    };
  } catch (err) {
    warn("[Push] Không đọc được phiên bản app", err);
    return { appVersion: "unknown", buildNumber: "unknown" };
  }
};

const isSameRegistration = (
  cache: PushRegistrationCache | null,
  registration: PushTokenRegistration,
  version: { appVersion: string; buildNumber: string },
) =>
  cache !== null &&
  cache.token === registration.fcmToken &&
  cache.appVersion === version.appVersion &&
  cache.buildNumber === version.buildNumber;

const scheduleRetry = (reason: string) => {
  if (retryAttempt >= REGISTER_RETRY_DELAYS_MS.length) {
    warn("[Push] Hết số lần thử đăng ký token, chờ lần foreground tiếp theo");
    return;
  }

  const delay = REGISTER_RETRY_DELAYS_MS[retryAttempt];
  retryAttempt += 1;

  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    syncPushToken(`${reason}:retry-${retryAttempt}`);
  }, delay);

  log("[Push] Sẽ thử đăng ký token lại", { delay, attempt: retryAttempt });
};

const runSync = async (reason: string) => {
  const granted = await ensureNotificationPermission();

  if (!granted) {
    // User từ chối là quyết định của họ — không retry, không coi là lỗi.
    log("[Push] Chưa được cấp quyền thông báo → bỏ qua đăng ký token", {
      reason,
    });
    return;
  }

  const token = await fetchFcmToken();

  if (!token) {
    scheduleRetry(reason);
    return;
  }

  activeToken = token;

  const registration = buildRegistration(token);
  const version = readAppVersion();
  const cache = await readCache();

  if (isSameRegistration(cache, registration, version)) {
    log("[Push] Token không đổi → bỏ qua gọi BE", { reason });
    retryAttempt = 0;
    return;
  }

  try {
    await updateFcmToken(registration);
    await writeCache({ token: registration.fcmToken, ...version });
    retryAttempt = 0;
    log("[Push] Gửi FCM token lên BE xong", { reason });
  } catch (err) {
    warn("[Push] Gửi FCM token lên BE thất bại", err);
    scheduleRetry(reason);
  }
};

/**
 * Xin quyền → lấy FCM token → gửi lên BE (bỏ qua nếu token không đổi).
 *
 * Chỉ gọi khi user đã đăng nhập, vì request cần Authorization header. An toàn khi
 * gọi nhiều lần: các lần gọi trùng sẽ dùng lại promise đang chạy.
 *
 * @param reason nhãn để đọc log, ví dụ "login" | "foreground" | "token-refresh".
 */
export const syncPushToken = (reason: string): Promise<void> => {
  if (syncPromise) {
    log("[Push] Đã có lần sync token đang chạy", { reason });
    return syncPromise;
  }

  clearRetryTimer();

  syncPromise = runSync(reason)
    .catch((err) => {
      warn("[Push] Sync token gặp lỗi ngoài dự kiến", err);
    })
    .finally(() => {
      syncPromise = null;
    });

  return syncPromise;
};

/**
 * Huỷ đăng ký token khi logout.
 *
 * Chủ ý KHÔNG gọi deleteToken() của FCM: token vẫn giữ nguyên cho lần đăng nhập
 * sau, việc chặn thông báo là trách nhiệm của BE sau khi nhận unregister. Cache
 * local bị xoá nên lần đăng nhập kế tiếp sẽ đăng ký lại (có thể là user khác).
 */
export const unregisterPushToken = async (): Promise<void> => {
  clearRetryTimer();
  retryAttempt = 0;

  const token = activeToken ?? (await readCache())?.token ?? null;

  // Xoá cache trước: nếu gọi BE lỗi thì lần login sau vẫn đăng ký lại được.
  await clearCache();
  activeToken = null;

  if (!token) {
    log("[Push] Không có token để huỷ đăng ký");
    return;
  }

  try {
    await logoutFcmToken(token);
    log("[Push] Đã tắt FCM token của máy này");
  } catch (err) {
    // Không chặn luồng logout vì lỗi này.
    warn("[Push] Tắt FCM token thất bại", err);
  }
};

/** Dừng mọi retry đang chờ. Gọi khi unmount hoặc logout. */
export const stopPushTokenRetries = (): void => {
  clearRetryTimer();
  retryAttempt = 0;
};
