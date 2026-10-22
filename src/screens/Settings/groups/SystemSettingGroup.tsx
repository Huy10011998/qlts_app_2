import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import { usePermission } from "../../../hooks/usePermission";
import {
  getLocalNetworkPermissionLabel,
  readStoredLocalNetworkPermission,
  requestLocalNetworkPermission,
  refreshStoredLocalNetworkPermission,
  StoredLocalNetworkPermissionState,
} from "../../../services/localNetworkPermission";
import {
  AppCameraPermissionStatus,
  checkCameraPermission,
  getCameraPermissionLabel,
  openAppPermissionSettings,
  requestCameraPermission,
} from "../../../services/cameraPermission";
import {
  AppLocationPermissionStatus,
  checkLocationPermission,
  getLocationPermissionLabel,
  requestLocationPermission,
} from "../../../services/locationPermission";
import {
  AppNotificationPermissionStatus,
  checkNotificationPermission,
  getNotificationPermissionLabel,
  openNotificationSettings,
  requestNotificationPermission,
} from "../../../services/notifications";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem, SettingSwitchRow } from "../shared/SettingRowItem";
import { AppAlert } from "../../../components/ui/AppAlert";

const LOCAL_NETWORK_FALLBACK_STATE: StoredLocalNetworkPermissionState = {
  hasShownNotice: false,
  hasRequestedPermission: false,
  status: "unknown",
};

/** Nhóm Hệ thống: các quyền của thiết bị và thông báo camera. */
export default function SystemSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();
  const isFocused = useIsFocused();
  const { can } = usePermission();
  // Quyền do IT cấp ở Admin → Nhóm → Phân quyền → Camera → "Noti Camera Mobile".
  const canUseCameraNoti = can("Camera", "NotiCameraMobile");

  const [localNetworkState, setLocalNetworkState] =
    useState<StoredLocalNetworkPermissionState>(LOCAL_NETWORK_FALLBACK_STATE);
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState<AppCameraPermissionStatus>("unknown");
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState<AppLocationPermissionStatus>("unknown");
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<AppNotificationPermissionStatus>("unknown");
  const [
    isUpdatingLocalNetworkPermission,
    setIsUpdatingLocalNetworkPermission,
  ] = useState(false);
  const [isUpdatingCameraPermission, setIsUpdatingCameraPermission] =
    useState(false);
  const [isUpdatingLocationPermission, setIsUpdatingLocationPermission] =
    useState(false);
  const [
    isUpdatingNotificationPermission,
    setIsUpdatingNotificationPermission,
  ] = useState(false);

  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const refreshPermissionState = useCallback(
    async (probeLocalNetwork = false) => {
      try {
        const [
          nextCameraPermissionStatus,
          nextLocationPermissionStatus,
          nextNotificationPermissionStatus,
          nextLocalNetworkState,
        ] = await Promise.all([
          checkCameraPermission().catch(() => "unknown" as const),
          checkLocationPermission().catch(() => "unknown" as const),
          checkNotificationPermission().catch(() => "unknown" as const),
          (probeLocalNetwork
            ? refreshStoredLocalNetworkPermission()
            : readStoredLocalNetworkPermission()
          ).catch(() => LOCAL_NETWORK_FALLBACK_STATE),
        ]);

        if (!isMountedRef.current) return;
        setCameraPermissionStatus(nextCameraPermissionStatus);
        setLocationPermissionStatus(nextLocationPermissionStatus);
        setNotificationPermissionStatus(nextNotificationPermissionStatus);
        setLocalNetworkState(nextLocalNetworkState);
      } catch {
        // Permission status is auxiliary; keep the previous values if refresh fails.
      }
    },
    [],
  );

  // Mỗi lần quay lại màn (vd từ Thông báo camera) đọc lại trạng thái quyền.
  useEffect(() => {
    if (isFocused) refreshPermissionState();
  }, [isFocused, refreshPermissionState]);

  // Người dùng hay rời app sang Cài đặt của máy để bật quyền rồi quay lại.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocusedRef.current) {
        refreshPermissionState(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermissionState]);

  const localNetworkStatusLabel = getLocalNetworkPermissionLabel(
    localNetworkState.status,
  );
  const cameraStatusLabel = getCameraPermissionLabel(cameraPermissionStatus);
  const locationStatusLabel = getLocationPermissionLabel(locationPermissionStatus);
  const notificationStatusLabel = getNotificationPermissionLabel(
    notificationPermissionStatus,
  );

  const handleToggleLocalNetworkPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingLocalNetworkPermission) return;

      if (!value) {
        AppAlert.alert(
          "Quyền mạng nội bộ",
          "Hệ điều hành không cho tắt trực tiếp quyền này trong app. Bạn có thể mở Cài đặt để thay đổi quyền thủ công.",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Mở Cài đặt",
              onPress: () => {
                openAppPermissionSettings();
              },
            },
          ],
        );
        return;
      }

      setIsUpdatingLocalNetworkPermission(true);
      try {
        const nextStatus = await requestLocalNetworkPermission();
        const refreshedState = await refreshStoredLocalNetworkPermission();
        if (!isMountedRef.current) return;
        setLocalNetworkState({
          ...refreshedState,
          hasRequestedPermission: true,
          status: nextStatus,
        });

        if (nextStatus !== "granted") {
          AppAlert.alert(
            "Quyền mạng nội bộ",
            "Không thể bật trực tiếp quyền này. Vui lòng mở Cài đặt nếu bạn đã từ chối trước đó.",
            [
              { text: "Đóng", style: "cancel" },
              {
                text: "Mở Cài đặt",
                onPress: () => {
                  openAppPermissionSettings();
                },
              },
            ],
          );
        }
      } catch {
        AppAlert.alert(
          "Lỗi",
          "Chưa thể cập nhật quyền mạng nội bộ lúc này. Vui lòng thử lại.",
        );
      } finally {
        if (isMountedRef.current) setIsUpdatingLocalNetworkPermission(false);
      }
    },
    [isUpdatingLocalNetworkPermission],
  );

  const handleToggleCameraPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingCameraPermission) return;

      if (!value) {
        AppAlert.alert(
          "Quyền camera",
          "Hệ điều hành không cho tắt trực tiếp quyền camera trong app. Bạn có thể mở Cài đặt để thay đổi quyền này.",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Mở Cài đặt",
              onPress: () => {
                openAppPermissionSettings();
              },
            },
          ],
        );
        return;
      }

      setIsUpdatingCameraPermission(true);
      try {
        const nextStatus = await requestCameraPermission();
        if (!isMountedRef.current) return;
        setCameraPermissionStatus(nextStatus);

        if (nextStatus === "blocked") {
          AppAlert.alert(
            "Quyền camera",
            "Camera đang bị chặn. Vui lòng mở Cài đặt để cấp lại quyền.",
            [
              { text: "Đóng", style: "cancel" },
              {
                text: "Mở Cài đặt",
                onPress: () => {
                  openAppPermissionSettings();
                },
              },
            ],
          );
          return;
        }

        if (nextStatus === "denied" || nextStatus === "unavailable") {
          AppAlert.alert(
            "Quyền camera",
            "Chưa thể bật quyền camera trên thiết bị này.",
          );
        }
      } catch {
        AppAlert.alert("Lỗi", "Chưa thể cập nhật quyền camera lúc này.");
      } finally {
        if (isMountedRef.current) setIsUpdatingCameraPermission(false);
      }
    },
    [isUpdatingCameraPermission],
  );

  const handleToggleLocationPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingLocationPermission) return;

      // Tắt hoặc đang "Gần đúng" (muốn đổi sang chính xác): app không tự đổi
      // được, chỉ mở Cài đặt của máy.
      if (!value || locationPermissionStatus === "approximate") {
        AppAlert.alert(
          "Quyền vị trí",
          value
            ? "Máy đang chỉ cho vị trí gần đúng. Mở Cài đặt, vào Quyền > Vị trí và bật Dùng vị trí chính xác để toạ độ trên ảnh đúng hơn."
            : "Hệ điều hành không cho tắt trực tiếp quyền vị trí trong app. Bạn có thể mở Cài đặt để thay đổi quyền này.",
          [
            { text: "Để sau", style: "cancel" },
            { text: "Mở Cài đặt", onPress: () => openAppPermissionSettings() },
          ],
        );
        return;
      }

      setIsUpdatingLocationPermission(true);
      try {
        const nextStatus = await requestLocationPermission();
        if (!isMountedRef.current) return;
        setLocationPermissionStatus(nextStatus);

        if (nextStatus === "blocked") {
          AppAlert.alert(
            "Quyền vị trí",
            "Vị trí đang bị chặn. Vui lòng mở Cài đặt để cấp lại quyền.",
            [
              { text: "Đóng", style: "cancel" },
              { text: "Mở Cài đặt", onPress: () => openAppPermissionSettings() },
            ],
          );
          return;
        }

        if (nextStatus === "denied" || nextStatus === "unavailable") {
          AppAlert.alert("Quyền vị trí", "Chưa thể bật quyền vị trí trên thiết bị này.");
        }
      } catch {
        AppAlert.alert("Lỗi", "Chưa thể cập nhật quyền vị trí lúc này.");
      } finally {
        if (isMountedRef.current) setIsUpdatingLocationPermission(false);
      }
    },
    [isUpdatingLocationPermission, locationPermissionStatus],
  );

  const handleToggleNotificationPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingNotificationPermission) return;

      if (!value) {
        AppAlert.alert(
          "Quyền thông báo",
          "Hệ điều hành không cho tắt trực tiếp quyền thông báo trong app. Bạn có thể mở Cài đặt để thay đổi quyền này.",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Mở Cài đặt",
              onPress: () => {
                openNotificationSettings();
              },
            },
          ],
        );
        return;
      }

      // Đã bị chặn thì gọi dialog hệ thống cũng không hiện gì (iOS chỉ hiện đúng
      // một lần trong đời app) → dẫn user vào Cài đặt luôn.
      if (notificationPermissionStatus === "blocked") {
        AppAlert.alert(
          "Quyền thông báo",
          "Thông báo đang bị chặn. Vui lòng mở Cài đặt để cấp lại quyền.",
          [
            { text: "Đóng", style: "cancel" },
            {
              text: "Mở Cài đặt",
              onPress: () => {
                openNotificationSettings();
              },
            },
          ],
        );
        return;
      }

      setIsUpdatingNotificationPermission(true);
      try {
        const nextStatus = await requestNotificationPermission();
        if (!isMountedRef.current) return;
        setNotificationPermissionStatus(nextStatus);

        if (nextStatus === "blocked") {
          AppAlert.alert(
            "Quyền thông báo",
            "Thông báo đang bị chặn. Vui lòng mở Cài đặt để cấp lại quyền.",
            [
              { text: "Đóng", style: "cancel" },
              {
                text: "Mở Cài đặt",
                onPress: () => {
                  openNotificationSettings();
                },
              },
            ],
          );
          return;
        }

        if (nextStatus !== "granted") {
          AppAlert.alert(
            "Quyền thông báo",
            "Chưa thể bật quyền thông báo trên thiết bị này.",
          );
        }
      } catch {
        AppAlert.alert("Lỗi", "Chưa thể cập nhật quyền thông báo lúc này.");
      } finally {
        if (isMountedRef.current) setIsUpdatingNotificationPermission(false);
      }
    },
    [isUpdatingNotificationPermission, notificationPermissionStatus],
  );

  return (
    <SettingSectionGroup accent={getSettingGroupColor("system")}>
      {/* Quyền mạng nội bộ chỉ có trên iOS; Android luôn coi là đã cấp
          (xem localNetworkPermission.ts) nên công tắc ở đó vô nghĩa. */}
      {Platform.OS === "ios" ? (
        <SettingSwitchRow
          iconName="wifi-outline"
          iconBg={C.sky}
          label="Quyền mạng nội bộ"
          sublabel={`Kết nối server nội bộ • ${localNetworkStatusLabel}${
            isUpdatingLocalNetworkPermission ? " • Đang cập nhật..." : ""
          }`}
          value={localNetworkState.status === "granted"}
          onValueChange={handleToggleLocalNetworkPermission}
        />
      ) : null}
      <SettingSwitchRow
        iconName="camera-outline"
        iconBg={C.emerald}
        label="Quyền camera"
        sublabel={`Quét QR và chụp hình • ${cameraStatusLabel}${
          isUpdatingCameraPermission ? " • Đang cập nhật..." : ""
        }`}
        value={cameraPermissionStatus === "granted"}
        onValueChange={handleToggleCameraPermission}
      />
      <SettingSwitchRow
        iconName="location-outline"
        iconBg={C.rose}
        label="Quyền vị trí"
        sublabel={`Gắn toạ độ vào ảnh chụp • ${locationStatusLabel}${
          isUpdatingLocationPermission ? " • Đang cập nhật..." : ""
        }`}
        value={
          locationPermissionStatus === "granted" ||
          locationPermissionStatus === "approximate"
        }
        onValueChange={handleToggleLocationPermission}
      />
      <SettingSwitchRow
        iconName="notifications-outline"
        iconBg={C.amber}
        label="Quyền thông báo"
        sublabel={`Nhận thông báo từ hệ thống • ${notificationStatusLabel}${
          isUpdatingNotificationPermission ? " • Đang cập nhật..." : ""
        }`}
        value={notificationPermissionStatus === "granted"}
        onValueChange={handleToggleNotificationPermission}
        isLast={!canUseCameraNoti}
      />
      {/* Chỉ hiện với người được cấp quyền nhận noti camera — 3 API bên
          trong đều trả 403 nếu thiếu quyền. */}
      {canUseCameraNoti ? (
        <SettingRowItem
          iconName="videocam-outline"
          iconBg={C.rose}
          label="Thông báo camera"
          sublabel="Tạm dừng thông báo AI phát hiện"
          onPress={() => navigation.navigate("CameraNotification")}
          isLast
        />
      ) : null}
    </SettingSectionGroup>
  );
}
