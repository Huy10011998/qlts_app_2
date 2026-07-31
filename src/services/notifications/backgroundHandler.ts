import notifee, { EventType } from "@notifee/react-native";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { log, warn } from "../../utils/Logger";
import { ensureNotificationChannels } from "./channels";
import { displayPushNotification, shouldDisplayLocally } from "./display";
import { normalizeRemoteMessage } from "./payload";
import { handlePushTap } from "./tapHandler";

let registered = false;

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
 * Đăng ký các handler chạy khi app ở background hoặc đã bị kill.
 *
 * ⚠️ PHẢI gọi ở phạm vi module trong index.js, TRƯỚC AppRegistry.registerComponent
 * và ngoài cây React. Khi app bị kill, Android tạo một JS runtime mới chỉ chạy
 * tới hết index.js rồi thực thi handler — nếu đăng ký bên trong component thì
 * handler không tồn tại và thông báo sẽ bị mất.
 *
 * Idempotent: gọi nhiều lần không đăng ký trùng.
 */
export const registerPushBackgroundHandlers = (): void => {
  if (registered) return;
  registered = true;

  try {
    setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
      try {
        const message = normalizeRemoteMessage(remoteMessage);

        log("[Push] Nhận message ở background", {
          id: message.id,
          hasOsNotification: message.hasOsNotification,
        });

        // isForeground = false: nếu payload có khối `notification` thì OS đã tự
        // dựng thông báo rồi, hiển thị thêm sẽ ra 2 thông báo trùng.
        if (!shouldDisplayLocally(message, false)) return;

        await ensureNotificationChannels();
        await displayPushNotification(message);
      } catch (err) {
        // Throw trong headless task sẽ làm Android log crash — luôn nuốt lỗi.
        warn("[Push] Xử lý message background thất bại", err);
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      try {
        if (type !== EventType.PRESS) return;

        const notification = detail.notification;
        if (!notification) return;

        // canNavigate = false: NavigationContainer chưa mount ở thời điểm này.
        // Payload được giữ lại và drain trong usePushNotifications khi app sẵn sàng.
        handlePushTap(
          {
            id: notification.id ?? "",
            data: toStringRecord(
              notification.data as Record<string, unknown> | undefined,
            ),
            source: "notifee-background",
          },
          { canNavigate: false },
        );
      } catch (err) {
        warn("[Push] Xử lý background event của notifee thất bại", err);
      }
    });

    log("[Push] Đã đăng ký background handlers");
  } catch (err) {
    registered = false;
    warn("[Push] Đăng ký background handlers thất bại", err);
  }
};
