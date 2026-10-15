import { Platform } from "react-native";
import {
  check,
  checkMultiple,
  PERMISSIONS,
  request,
  requestMultiple,
  RESULTS,
  type PermissionStatus,
} from "react-native-permissions";

/** `approximate`: Android chỉ cấp "Gần đúng" — vẫn gắn được toạ độ, sai số lớn hơn. */
export type AppLocationPermissionStatus =
  | "granted"
  | "approximate"
  | "denied"
  | "blocked"
  | "unavailable"
  | "unknown";

const normalize = (status: PermissionStatus): AppLocationPermissionStatus => {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return "granted";
    case RESULTS.DENIED:
      return "denied";
    case RESULTS.BLOCKED:
      return "blocked";
    case RESULTS.UNAVAILABLE:
      return "unavailable";
    default:
      return "unknown";
  }
};

const ANDROID_FINE = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
const ANDROID_COARSE = PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION;

const normalizeAndroid = (
  statuses: Record<typeof ANDROID_FINE | typeof ANDROID_COARSE, PermissionStatus>,
): AppLocationPermissionStatus => {
  const fine = normalize(statuses[ANDROID_FINE]);
  if (fine === "granted") return "granted";
  if (normalize(statuses[ANDROID_COARSE]) === "granted") return "approximate";
  return fine;
};

/** Quyền vị trí khi dùng app — để gắn toạ độ vào ảnh chụp, xác nhận vị trí. */
export const checkLocationPermission = async (): Promise<AppLocationPermissionStatus> => {
  if (Platform.OS === "ios") return normalize(await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE));
  if (Platform.OS === "android") {
    return normalizeAndroid(await checkMultiple([ANDROID_FINE, ANDROID_COARSE]));
  }
  return "unavailable";
};

export const requestLocationPermission = async (): Promise<AppLocationPermissionStatus> => {
  if (Platform.OS === "ios") return normalize(await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE));
  if (Platform.OS === "android") {
    return normalizeAndroid(await requestMultiple([ANDROID_FINE, ANDROID_COARSE]));
  }
  return "unavailable";
};

export const getLocationPermissionLabel = (status: AppLocationPermissionStatus) => {
  switch (status) {
    case "granted":
      return "Đã cấp quyền";
    case "approximate":
      return "Chỉ vị trí gần đúng";
    case "denied":
      return "Chưa cấp quyền";
    case "blocked":
      return "Đã chặn quyền";
    case "unavailable":
      return "Thiết bị không hỗ trợ";
    default:
      return "Chưa xác định";
  }
};
