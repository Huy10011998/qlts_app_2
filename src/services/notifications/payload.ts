import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { isCameraMotionPush } from "./cameraPush";
import { resolveChannelId } from "./channels";
import type { NormalizedPushMessage } from "./types";

type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

/**
 * FCM khai báo data là `{ [key: string]: string | object }` — iOS có thể trả về
 * giá trị đã được parse thành object. Ép hết về string để phần còn lại của
 * luồng chỉ phải làm việc với một kiểu duy nhất.
 */
const stringifyData = (
  data: RemoteMessage["data"],
): Record<string, string> => {
  if (!data) return {};

  return Object.entries(data).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value === null || value === undefined) return acc;

      if (typeof value === "string") {
        acc[key] = value;
        return acc;
      }

      try {
        acc[key] = JSON.stringify(value);
      } catch {
        acc[key] = String(value);
      }

      return acc;
    },
    {},
  );
};

/** Hash 32-bit ổn định — chỉ dùng làm khóa dedupe, không cần chống xung đột mạnh. */
/* eslint-disable no-bitwise -- thuật toán hash bắt buộc dùng phép toán bit */
const hashString = (value: string): string => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `h${(hash >>> 0).toString(36)}`;
};
/* eslint-enable no-bitwise */

const buildFallbackId = (
  title: string | undefined,
  body: string | undefined,
  data: Record<string, string>,
) => {
  try {
    return hashString(
      JSON.stringify({
        title: title ?? "",
        body: body ?? "",
        data: Object.keys(data)
          .sort()
          .map((key) => [key, data[key]]),
      }),
    );
  } catch {
    return hashString(`${title ?? ""}|${body ?? ""}`);
  }
};

const firstNonEmpty = (...values: (string | undefined)[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

/**
 * Chuẩn hóa RemoteMessage của FCM thành dạng app dùng nội bộ.
 *
 * BE có 2 cách gửi và app hỗ trợ cả hai:
 * - Có khối `notification` → OS tự hiển thị ở background/quit
 *   (`hasOsNotification = true`, app chỉ hiển thị khi đang foreground).
 * - Data-only → app tự hiển thị qua notifee ở mọi trạng thái.
 */
export const normalizeRemoteMessage = (
  remoteMessage: RemoteMessage,
): NormalizedPushMessage => {
  const data = stringifyData(remoteMessage.data);

  const title = firstNonEmpty(remoteMessage.notification?.title, data.title);
  const body = firstNonEmpty(remoteMessage.notification?.body, data.body);

  const id = firstNonEmpty(
    data.notificationId,
    remoteMessage.messageId,
  ) ?? buildFallbackId(title, body, data);

  return {
    id,
    title,
    body,
    data,
    // BE không gửi channelId cho noti camera — chuyển động là việc cần biết ngay
    // nên mặc định đẩy lên channel ưu tiên cao.
    channelId: resolveChannelId(
      data.channelId ?? (isCameraMotionPush(data) ? "urgent" : undefined),
    ),
    hasOsNotification: Boolean(remoteMessage.notification),
  };
};

/**
 * Parse `data.params` (JSON string) thành object params cho navigation.
 * Trả về undefined nếu BE gửi JSON sai — không được làm crash luồng mở app.
 */
export const parseNotificationParams = (
  rawParams?: string,
): Record<string, unknown> | undefined => {
  if (!rawParams || rawParams.trim().length === 0) return undefined;

  try {
    const parsed = JSON.parse(rawParams);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // rơi xuống undefined
  }

  return undefined;
};
