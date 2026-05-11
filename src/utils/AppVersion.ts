export type {
  StoreVersionInfo,
  UpdateReminderState,
} from "./appVersion/types";
export {
  IOS_APP_ID,
  IOS_COUNTRY,
  IOS_STORE_URL,
  ANDROID_PACKAGE_NAME,
  ANDROID_STORE_URL,
  UPDATE_REMINDER_KEY,
  UPDATE_REMINDER_DELAY_MS,
} from "./appVersion/constants";
export { isNewerVersion, normalizeVersion } from "./appVersion/version";
export { getStoreVersionInfo, extractAndroidVersion } from "./appVersion/store";
export {
  openStoreForUpdate,
  shouldShowUpdateReminder,
  markUpdateReminderDismissed,
} from "./appVersion/reminder";
