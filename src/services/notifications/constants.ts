/**
 * Hằng số dùng chung cho toàn bộ luồng push notification.
 *
 * ⚠️ DEFAULT_CHANNEL_ID phải trùng với
 * `com.google.firebase.messaging.default_notification_channel_id` trong
 * android/app/src/main/AndroidManifest.xml, và ANDROID_SMALL_ICON phải trùng tên
 * drawable `android/app/src/main/res/drawable/ic_notification.xml`.
 */

/** Channel mặc định cho mọi thông báo nghiệp vụ. */
export const DEFAULT_CHANNEL_ID = "qlts_default";

/** Channel ưu tiên cao — dùng khi BE gửi data.channelId = "urgent". */
export const URGENT_CHANNEL_ID = "qlts_urgent";

/** Channel im lặng — thông báo phụ, không rung/không âm. */
export const SILENT_CHANNEL_ID = "qlts_silent";

/** Alias ngắn mà BE có thể gửi trong data.channelId. */
export const CHANNEL_ALIASES: Record<string, string> = {
  default: DEFAULT_CHANNEL_ID,
  urgent: URGENT_CHANNEL_ID,
  high: URGENT_CHANNEL_ID,
  silent: SILENT_CHANNEL_ID,
  low: SILENT_CHANNEL_ID,
  [DEFAULT_CHANNEL_ID]: DEFAULT_CHANNEL_ID,
  [URGENT_CHANNEL_ID]: URGENT_CHANNEL_ID,
  [SILENT_CHANNEL_ID]: SILENT_CHANNEL_ID,
};

/** Tên drawable của small icon (Android tô lại bằng NOTIFICATION_COLOR). */
export const ANDROID_SMALL_ICON = "ic_notification";

/** Giữ đồng bộ với @color/notification_color trong res/values/color.xml. */
export const NOTIFICATION_COLOR = "#E31E24";

/**
 * Android bắt buộc có pressAction để phát sinh EventType.PRESS khi user bấm vào
 * thông báo. Không có nó thì bấm vào thông báo sẽ không mở được app.
 */
export const DEFAULT_PRESS_ACTION_ID = "default";

/** Số message id gần nhất được ghi nhớ để chống hiển thị trùng. */
export const DISPLAY_DEDUPE_LIMIT = 60;

/** Số lần bấm gần nhất được ghi nhớ để chống điều hướng trùng. */
export const TAP_DEDUPE_LIMIT = 30;

/** AsyncStorage key cho lần đăng ký token gần nhất đã gửi BE thành công. */
export const PUSH_REGISTRATION_CACHE_KEY = "push.registration.v1";

/**
 * iOS: FCM token chỉ lấy được sau khi APNs đã trả device token về. Poll trong
 * khoảng này trước khi gọi getToken() để tránh lỗi
 * "APNS token has not been set yet".
 */
export const APNS_TOKEN_MAX_WAIT_MS = 12_000;
export const APNS_TOKEN_POLL_INTERVAL_MS = 400;

/** Backoff khi gửi token lên BE thất bại (lỗi mạng / BE chưa sẵn sàng). */
export const REGISTER_RETRY_DELAYS_MS = [3_000, 10_000, 30_000, 60_000];
