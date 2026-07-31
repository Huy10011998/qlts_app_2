/**
 * Push notification (Firebase Cloud Messaging + notifee).
 *
 * Sơ đồ luồng:
 *
 *   index.js ──► registerPushBackgroundHandlers()      (module scope, bắt buộc)
 *                  ├─ setBackgroundMessageHandler → hiển thị message data-only
 *                  └─ notifee.onBackgroundEvent    → nhớ lại lần bấm thông báo
 *
 *   AppBootstrap ──► usePushNotifications()
 *                  ├─ ensureNotificationChannels()   (Android)
 *                  ├─ onMessage           → hiển thị khi app đang mở
 *                  ├─ onNotificationOpenedApp / getInitialNotification
 *                  ├─ notifee.onForegroundEvent / getInitialNotification
 *                  ├─ onTokenRefresh      → syncPushToken()
 *                  └─ syncPushToken()     → xin quyền, lấy token, gửi BE
 *
 * Contract payload với BE: xem mục "Push Notification" trong README.md ở gốc repo.
 */
export { ensureNotificationChannels, resolveChannelId } from "./channels";
export {
  clearNotificationBadge,
  displayPushNotification,
  shouldDisplayLocally,
} from "./display";
export { normalizeRemoteMessage, parseNotificationParams } from "./payload";
export {
  checkNotificationPermission,
  ensureNotificationPermission,
  getNotificationPermissionLabel,
  hasNotificationPermission,
  openNotificationSettings,
  requestNotificationPermission,
} from "./permissions";
export type { AppNotificationPermissionStatus } from "./permissions";
export { isKnownPushRoute, navigateToPushRoute } from "./pushRoutes";
export { registerDeviceToken, unregisterDeviceToken } from "./pushTokenApi";
export {
  stopPushTokenRetries,
  syncPushToken,
  unregisterPushToken,
} from "./pushTokenSync";
export { registerPushBackgroundHandlers } from "./backgroundHandler";
export {
  clearPendingPushTap,
  drainPendingPushTap,
  handlePushTap,
  hasPendingPushTap,
} from "./tapHandler";
export { fetchFcmToken } from "./token";
export * from "./constants";
export type * from "./types";
