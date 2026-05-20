import { Platform } from "react-native";
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
  type Permission,
  type PermissionStatus,
} from "react-native-permissions";

export type AppCameraPermissionStatus =
  | "granted"
  | "denied"
  | "blocked"
  | "unavailable"
  | "unknown";

const getCameraPermission = (): Permission | null => {
  if (Platform.OS === "ios") return PERMISSIONS.IOS.CAMERA;
  if (Platform.OS === "android") return PERMISSIONS.ANDROID.CAMERA;
  return null;
};

const normalizeCameraStatus = (
  status: PermissionStatus,
): AppCameraPermissionStatus => {
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

export const checkCameraPermission =
  async (): Promise<AppCameraPermissionStatus> => {
    const permission = getCameraPermission();
    if (!permission) return "unavailable";

    const status = await check(permission);
    return normalizeCameraStatus(status);
  };

export const requestCameraPermission =
  async (): Promise<AppCameraPermissionStatus> => {
    const permission = getCameraPermission();
    if (!permission) return "unavailable";

    const status = await request(permission);
    return normalizeCameraStatus(status);
  };

export const openAppPermissionSettings = async () => {
  await openSettings();
};

export const getCameraPermissionLabel = (
  status: AppCameraPermissionStatus,
) => {
  switch (status) {
    case "granted":
      return "Đã cấp quyền";
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
