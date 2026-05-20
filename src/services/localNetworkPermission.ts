import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import {
  LOCAL_NETWORK_NOTICE_SHOWN_KEY,
  LOCAL_NETWORK_PERMISSION_REQUESTED_KEY,
  LOCAL_NETWORK_PERMISSION_STATUS_KEY,
} from "../constants/PermissionStorage";

export type LocalNetworkPermissionStatus = "granted" | "denied" | "unknown";

export type StoredLocalNetworkPermissionState = {
  hasShownNotice: boolean;
  hasRequestedPermission: boolean;
  status: LocalNetworkPermissionStatus;
};

type LocalNetworkPermissionModule = {
  requestAccess: () => Promise<{ status?: string }>;
  checkAccess: () => Promise<{ status?: string }>;
};

const nativeLocalNetworkPermission =
  NativeModules.LocalNetworkPermission as
    | LocalNetworkPermissionModule
    | undefined;

const normalizeStatus = (value?: string): LocalNetworkPermissionStatus => {
  if (value === "granted" || value === "denied") return value;
  return "unknown";
};

const normalizeRequiredPermissionStatus = (
  value?: string,
): LocalNetworkPermissionStatus => {
  const status = normalizeStatus(value);
  return status === "granted" ? "granted" : "denied";
};

const savePermissionState = async (
  status: LocalNetworkPermissionStatus,
  hasRequestedPermission = true,
) => {
  await AsyncStorage.multiSet([
    [LOCAL_NETWORK_PERMISSION_STATUS_KEY, status],
    [
      LOCAL_NETWORK_PERMISSION_REQUESTED_KEY,
      hasRequestedPermission ? "1" : "0",
    ],
  ]);
};

export const markLocalNetworkNoticeShown = async () => {
  await AsyncStorage.setItem(LOCAL_NETWORK_NOTICE_SHOWN_KEY, "1");
};

export const readStoredLocalNetworkPermission =
  async (): Promise<StoredLocalNetworkPermissionState> => {
    const values = await AsyncStorage.multiGet([
      LOCAL_NETWORK_NOTICE_SHOWN_KEY,
      LOCAL_NETWORK_PERMISSION_REQUESTED_KEY,
      LOCAL_NETWORK_PERMISSION_STATUS_KEY,
    ]);

    const lookup = new Map(values);

    return {
      hasShownNotice: lookup.get(LOCAL_NETWORK_NOTICE_SHOWN_KEY) === "1",
      hasRequestedPermission:
        lookup.get(LOCAL_NETWORK_PERMISSION_REQUESTED_KEY) === "1",
      status: normalizeStatus(
        lookup.get(LOCAL_NETWORK_PERMISSION_STATUS_KEY) ?? undefined,
      ),
    };
  };

export const requestLocalNetworkPermission =
  async (): Promise<LocalNetworkPermissionStatus> => {
    if (Platform.OS !== "ios") return "granted";
    if (!nativeLocalNetworkPermission?.requestAccess) return "unknown";

    await AsyncStorage.setItem(LOCAL_NETWORK_PERMISSION_REQUESTED_KEY, "1");
    const result = await nativeLocalNetworkPermission.requestAccess();
    const status = normalizeRequiredPermissionStatus(result?.status);
    await savePermissionState(status);
    return status;
  };

export const checkLocalNetworkPermission =
  async (): Promise<LocalNetworkPermissionStatus> => {
    if (Platform.OS !== "ios") return "granted";
    if (!nativeLocalNetworkPermission?.checkAccess) return "unknown";

    const result = await nativeLocalNetworkPermission.checkAccess();
    const status = normalizeRequiredPermissionStatus(result?.status);
    await savePermissionState(status);
    return status;
  };

export const refreshStoredLocalNetworkPermission =
  async (): Promise<StoredLocalNetworkPermissionState> => {
    const currentState = await readStoredLocalNetworkPermission();

    if (Platform.OS !== "ios" || !currentState.hasRequestedPermission) {
      return currentState;
    }

    const status = await checkLocalNetworkPermission();
    return {
      ...currentState,
      status,
    };
  };

export const getLocalNetworkPermissionLabel = (
  status: LocalNetworkPermissionStatus,
) => {
  if (status === "granted") return "Đã cấp quyền";
  if (status === "denied") return "Chưa cấp quyền";
  return "Chưa xác định";
};
