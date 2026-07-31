import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import notifee, { EventType } from "@notifee/react-native";
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { log, warn } from "../../utils/Logger";
import { canAccessAppNavigator } from "../../navigation/shared/rootNavigationHelpers";
import {
  clearNotificationBadge,
  clearPendingPushTap,
  displayPushNotification,
  drainPendingPushTap,
  ensureNotificationChannels,
  handlePushTap,
  hasPendingPushTap,
  normalizeRemoteMessage,
  shouldDisplayLocally,
  stopPushTokenRetries,
  syncPushToken,
  unregisterPushToken,
} from "../../services/notifications";

type UsePushNotificationsParams = {
  isAuthenticated: boolean;
  authReady?: boolean;
  iosAuthenticated: boolean;
};

/** Số lần thử điều hướng lại khi NavigationContainer chưa kịp mount AppNavigator. */
const DRAIN_MAX_ATTEMPTS = 8;
const DRAIN_RETRY_DELAY_MS = 300;

const toStringRecord = (
  data: Record<string, unknown> | undefined,
): Record<string, string> => {
  if (!data) return {};

  return Object.entries(data).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value === null || value === undefined) return acc;
      acc[key] = typeof value === "string" ? value : String(value);
      return acc;
    },
    {},
  );
};

/**
 * Toàn bộ phần push notification chạy khi app đang sống.
 *
 * Các handler cho trạng thái background/quit nằm ở
 * `services/notifications/backgroundHandler` và được đăng ký từ index.js.
 */
export function usePushNotifications({
  isAuthenticated,
  authReady,
  iosAuthenticated,
}: UsePushNotificationsParams) {
  const canNavigate = canAccessAppNavigator({
    iosAuthenticated,
    isAuthenticated,
  });

  // Đọc trong callback của listener nên phải qua ref: listener chỉ đăng ký một
  // lần, nếu đọc biến canNavigate trực tiếp sẽ luôn thấy giá trị của lần render đầu.
  const canNavigateRef = useRef(canNavigate);
  canNavigateRef.current = canNavigate;

  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRegisteredRef = useRef(false);
  const hasHandledInitialRef = useRef(false);

  // ===== CHANNELS + BADGE =====
  useEffect(() => {
    ensureNotificationChannels();
    clearNotificationBadge();
  }, []);

  // ===== MESSAGE ĐẾN KHI APP ĐANG MỞ =====
  useEffect(() => {
    const unsubscribe = onMessage(getMessaging(), async (remoteMessage) => {
      try {
        const message = normalizeRemoteMessage(remoteMessage);

        log("[Push] Nhận message ở foreground", { id: message.id });

        // isForeground = true: cả Android và iOS đều KHÔNG tự hiện thông báo khi
        // app đang mở, nên app phải chủ động hiển thị.
        if (!shouldDisplayLocally(message, true)) return;

        await displayPushNotification(message);
      } catch (err) {
        warn("[Push] Xử lý message foreground thất bại", err);
      }
    });

    return unsubscribe;
  }, []);

  // ===== BẤM VÀO THÔNG BÁO =====
  useEffect(() => {
    // Thông báo do OS dựng từ khối `notification`, app đang ở background.
    const unsubscribeOpened = onNotificationOpenedApp(
      getMessaging(),
      (remoteMessage) => {
        const message = normalizeRemoteMessage(remoteMessage);
        handlePushTap(
          { id: message.id, data: message.data, source: "fcm-opened" },
          { canNavigate: canNavigateRef.current },
        );
      },
    );

    // Thông báo do notifee hiển thị, bấm khi app đang mở.
    const unsubscribeForeground = notifee.onForegroundEvent(
      ({ type, detail }) => {
        if (type !== EventType.PRESS) return;

        const notification = detail.notification;
        if (!notification) return;

        handlePushTap(
          {
            id: notification.id ?? "",
            data: toStringRecord(
              notification.data as Record<string, unknown> | undefined,
            ),
            source: "notifee-foreground",
          },
          { canNavigate: canNavigateRef.current },
        );
      },
    );

    return () => {
      unsubscribeOpened();
      unsubscribeForeground();
    };
  }, []);

  // ===== APP MỞ TỪ TRẠNG THÁI QUIT DO BẤM THÔNG BÁO =====
  useEffect(() => {
    if (hasHandledInitialRef.current) return;
    hasHandledInitialRef.current = true;

    let cancelled = false;

    const readInitialNotifications = async () => {
      try {
        // Hỏi cả hai nguồn: thông báo có thể do OS dựng (FCM) hoặc do notifee
        // hiển thị từ background handler. Trùng lặp đã được chặn bằng dedupe theo id.
        const [fcmInitial, notifeeInitial] = await Promise.all([
          getInitialNotification(getMessaging()).catch(() => null),
          notifee.getInitialNotification().catch(() => null),
        ]);

        if (cancelled) return;

        if (fcmInitial) {
          const message = normalizeRemoteMessage(fcmInitial);
          handlePushTap(
            { id: message.id, data: message.data, source: "fcm-initial" },
            { canNavigate: canNavigateRef.current },
          );
        }

        if (notifeeInitial?.notification) {
          handlePushTap(
            {
              id: notifeeInitial.notification.id ?? "",
              data: toStringRecord(
                notifeeInitial.notification.data as
                  | Record<string, unknown>
                  | undefined,
              ),
              source: "notifee-initial",
            },
            { canNavigate: canNavigateRef.current },
          );
        }
      } catch (err) {
        warn("[Push] Đọc initial notification thất bại", err);
      }
    };

    readInitialNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===== ĐIỀU HƯỚNG LẠI LẦN BẤM ĐANG CHỜ =====
  useEffect(() => {
    const clearDrainTimer = () => {
      if (drainTimerRef.current) {
        clearTimeout(drainTimerRef.current);
        drainTimerRef.current = null;
      }
    };

    if (!canNavigate) {
      clearDrainTimer();
      return clearDrainTimer;
    }

    let attempt = 0;

    // NavigationContainer có thể chưa mount AppNavigator ngay ở effect này (ví dụ
    // Android còn đang chặn vì mất kết nối), nên thử lại vài lần thay vì bỏ luôn.
    const attemptDrain = () => {
      drainPendingPushTap();

      if (!hasPendingPushTap()) return;

      attempt += 1;
      if (attempt >= DRAIN_MAX_ATTEMPTS) {
        warn("[Push] Không điều hướng được thông báo đang chờ, bỏ qua");
        clearPendingPushTap();
        return;
      }

      drainTimerRef.current = setTimeout(attemptDrain, DRAIN_RETRY_DELAY_MS);
    };

    attemptDrain();

    return clearDrainTimer;
  }, [canNavigate]);

  // ===== ĐĂNG KÝ / HUỶ ĐĂNG KÝ TOKEN THEO PHIÊN ĐĂNG NHẬP =====
  useEffect(() => {
    if (!authReady) return;

    const canRegister = canAccessAppNavigator({
      iosAuthenticated,
      isAuthenticated,
    });

    if (canRegister) {
      wasRegisteredRef.current = true;
      syncPushToken("session");
      return;
    }

    // Chỉ huỷ đăng ký khi thực sự vừa rời khỏi trạng thái đã đăng nhập, tránh gọi
    // BE mỗi lần app khởi động ở màn hình login.
    if (wasRegisteredRef.current) {
      wasRegisteredRef.current = false;
      stopPushTokenRetries();
      clearPendingPushTap();
      unregisterPushToken();
    }
  }, [authReady, isAuthenticated, iosAuthenticated]);

  // ===== TOKEN BỊ FIREBASE LÀM MỚI =====
  useEffect(() => {
    const unsubscribe = onTokenRefresh(getMessaging(), (token) => {
      log("[Push] FCM token được làm mới", {
        preview: `${token.slice(0, 12)}…`,
      });

      // Token mới chỉ có ý nghĩa khi đang có phiên đăng nhập để map lên BE.
      if (canNavigateRef.current) syncPushToken("token-refresh");
    });

    return unsubscribe;
  }, []);

  // ===== APP TRỞ LẠI FOREGROUND =====
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;

      clearNotificationBadge();

      // Bắt lại các trường hợp token đổi khi app ở background, hoặc lần đăng ký
      // trước thất bại vì mất mạng.
      if (canNavigateRef.current) syncPushToken("foreground");
    });

    return () => subscription.remove();
  }, []);

  // ===== DỌN DẸP =====
  useEffect(
    () => () => {
      stopPushTokenRetries();
    },
    [],
  );

  return {
    /** true khi app đã đủ điều kiện điều hướng theo thông báo. */
    canHandleNotificationTap: canNavigate,
    isIos: Platform.OS === "ios",
  };
}
