import notifee, { AndroidImportance } from "@notifee/react-native";
import { log, warn } from "../../utils/Logger";
import { ensureNotificationChannels } from "./channels";
import {
  ANDROID_SMALL_ICON,
  DEFAULT_PRESS_ACTION_ID,
  DISPLAY_DEDUPE_LIMIT,
  NOTIFICATION_COLOR,
  URGENT_CHANNEL_ID,
} from "./constants";
import { createDedupeStore } from "./dedupe";
import type { NormalizedPushMessage } from "./types";

const displayedMessages = createDedupeStore(DISPLAY_DEDUPE_LIMIT);

/**
 * Hiển thị một thông báo local bằng notifee.
 *
 * Chỉ gọi hàm này khi chắc chắn OS chưa tự hiển thị thông báo đó
 * (xem `shouldDisplayLocally`), nếu không user sẽ thấy 2 thông báo trùng nhau.
 */
export const displayPushNotification = async (
  message: NormalizedPushMessage,
): Promise<void> => {
  // Thông báo rỗng thì bỏ qua — data-only message dùng để đồng bộ dữ liệu ngầm
  // không nên tạo ra một thông báo trắng trên máy user.
  if (!message.title && !message.body) {
    log("[Push] Bỏ qua hiển thị: message không có title/body", {
      id: message.id,
    });
    return;
  }

  if (!displayedMessages.claim(message.id)) {
    log("[Push] Bỏ qua hiển thị trùng", { id: message.id });
    return;
  }

  try {
    await ensureNotificationChannels();

    await notifee.displayNotification({
      id: message.id,
      title: message.title,
      body: message.body,
      // Giữ nguyên data để handler khi bấm vào thông báo đọc lại được route/params.
      data: message.data,
      android: {
        channelId: message.channelId,
        smallIcon: ANDROID_SMALL_ICON,
        color: NOTIFICATION_COLOR,
        importance:
          message.channelId === URGENT_CHANNEL_ID
            ? AndroidImportance.HIGH
            : AndroidImportance.DEFAULT,
        // Bắt buộc: không có pressAction thì bấm vào thông báo sẽ không mở app
        // và cũng không phát sinh EventType.PRESS.
        pressAction: {
          id: DEFAULT_PRESS_ACTION_ID,
          launchActivity: "default",
        },
      },
      ios: {
        sound: "default",
        // iOS mặc định KHÔNG hiện banner khi app đang foreground. Khai báo rõ
        // để thông báo vẫn hiện lúc user đang dùng app.
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
          banner: true,
          list: true,
        },
      },
    });

    log("[Push] Đã hiển thị thông báo", {
      id: message.id,
      channelId: message.channelId,
    });
  } catch (err) {
    // Nhả id để lần gửi lại của FCM còn cơ hội hiển thị.
    displayedMessages.release(message.id);
    warn("[Push] Hiển thị thông báo thất bại", err);
  }
};

/**
 * Quyết định app có phải tự hiển thị thông báo hay không.
 *
 * | Trạng thái  | BE gửi notification+data | BE gửi data-only |
 * |-------------|--------------------------|------------------|
 * | Foreground  | app hiển thị (OS không)  | app hiển thị     |
 * | Background  | OS đã hiển thị → bỏ qua  | app hiển thị     |
 * | Quit        | OS đã hiển thị → bỏ qua  | app hiển thị     |
 */
export const shouldDisplayLocally = (
  message: NormalizedPushMessage,
  isForeground: boolean,
): boolean => isForeground || !message.hasOsNotification;

/** Xoá badge trên icon app (iOS) — gọi khi user mở app. */
export const clearNotificationBadge = async (): Promise<void> => {
  try {
    await notifee.setBadgeCount(0);
  } catch (err) {
    warn("[Push] Clear badge thất bại", err);
  }
};
