export type {
  StoreVersionInfo,
  UpdateReminderState,
} from "./appVersion/types";
export {
  IOS_APP_ID,
  IOS_COUNTRY,
  IOS_LOOKUP_COUNTRIES,
  IOS_STORE_URL,
  ANDROID_PACKAGE_NAME,
  ANDROID_STORE_URL,
  UPDATE_REMINDER_KEY,
  UPDATE_REMINDER_DELAY_MS,
} from "./appVersion/constants";
export {
  formatVersionWithBuild,
  isNewerAppVersion,
  isNewerVersion,
  normalizeVersion,
  selectLatestVersionInfo,
} from "./appVersion/version";
export { getStoreVersionInfo } from "./appVersion/store";
export {
  getUpdateReminderKey,
  openStoreForUpdate,
  shouldShowUpdateReminder,
  markUpdateReminderDismissed,
} from "./appVersion/reminder";
