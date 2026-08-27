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
 * Thông báo camera phát hiện chuyển động: xem `cameraPush` (định tuyến) và
 * `cameraNotiApi` (tạm dừng / bật lại).
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
export {
  buildCameraMotionParams,
  CAMERA_MOTION_ROUTE,
  CAMERA_MOTION_TYPE,
  getCameraMotionGroupId,
  isCameraMotionPush,
} from "./cameraPush";
export {
  CameraNotiPhamVi,
  getTrangThaiNotiCamera,
  huyTamDungNotiCamera,
  tamDungNotiCamera,
} from "./cameraNotiApi";
export type {
  CameraNotiLenh,
  TamDungNotiCameraInput,
} from "./cameraNotiApi";
export { logoutFcmToken, updateFcmToken } from "./pushTokenApi";
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
