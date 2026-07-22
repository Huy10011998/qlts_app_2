import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  AppState,
  Platform,
  StatusBar,
} from "react-native";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import IsLoading from "../../components/ui/IconLoading";
import { changePasswordApi } from "../../services";
import { API_ENDPOINTS } from "../../config/index";
import type { StackNavigation, UserInfo } from "../../types";
import {
  callApi,
  clearTokenStorage,
  hardResetApi,
  resetAuthState,
} from "../../services/data/callApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearPermissions } from "../../store/PermissionSlice";
import { useAppDispatch } from "../../store/hooks";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import {
  readFaceIdEnabled,
  writeFaceIdEnabled,
} from "../../services/auth/faceIdFlag";
import { C, useAppColors } from "../../utils/helpers/colors";
import EmptyState from "../../components/ui/EmptyState";
import { warn } from "../../utils/Logger";
import SettingWaveDivider from "./shared/SettingWaveDivider";
import SettingProfileHeader from "./shared/SettingProfileHeader";
import SettingSectionGroup from "./shared/SettingSectionGroup";
import { SettingRowItem, SettingSwitchRow } from "./shared/SettingRowItem";
import ChangePasswordModal from "./shared/ChangePasswordModal";
import { useColorScheme } from "../../hooks/useColorScheme";
import { readStoredAuthTokens } from "../../context/authStorage";
import {
  getLocalNetworkPermissionLabel,
  readStoredLocalNetworkPermission,
  requestLocalNetworkPermission,
  refreshStoredLocalNetworkPermission,
  StoredLocalNetworkPermissionState,
} from "../../services/localNetworkPermission";
import {
  AppCameraPermissionStatus,
  checkCameraPermission,
  getCameraPermissionLabel,
  openAppPermissionSettings,
  requestCameraPermission,
} from "../../services/cameraPermission";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";

const LOCAL_NETWORK_FALLBACK_STATE: StoredLocalNetworkPermissionState = {
  hasShownNotice: false,
  hasRequestedPermission: false,
  status: "unknown",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SettingScreen = () => {
  const isDark = useColorScheme() === "dark";
  const colors = useAppColors();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo>();
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  const [localNetworkState, setLocalNetworkState] =
    useState<StoredLocalNetworkPermissionState>({
      hasShownNotice: false,
      hasRequestedPermission: false,
      status: "unknown",
    });
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState<AppCameraPermissionStatus>("unknown");
  const [
    isUpdatingLocalNetworkPermission,
    setIsUpdatingLocalNetworkPermission,
  ] = useState(false);
  const [isUpdatingCameraPermission, setIsUpdatingCameraPermission] =
    useState(false);

  const navigation = useNavigation<StackNavigation<"Profile">>();
  const { logout, logoutReason } = useAuth();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const userRef = useRef<UserInfo | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);
  const loadingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const isMountedRef = useRef(true);
  const isScreenActiveRef = useRef(false);
  const isFocusedRef = useRef(false);
  const blockingLoaderActiveRef = useRef(false);
  const isFaceIdPromptActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isScreenActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    hasLoadedOnceRef.current = hasLoadedOnce;
  }, [hasLoadedOnce]);
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const canUpdateScreen = useCallback(
    () =>
      isMountedRef.current &&
      isScreenActiveRef.current &&
      isFocusedRef.current &&
      !isLoggingOutRef.current &&
      logoutReason !== "EXPIRED",
    [logoutReason]
  );

  const isAuthExpiredError = useCallback(
    (error: any) =>
      error?.NEED_LOGIN ||
      error?.response?.status === 401 ||
      error?.response?.status === 403,
    []
  );

  const refreshPermissionState = useCallback(
    async (probeLocalNetwork = false) => {
      try {
        const [nextCameraPermissionStatus, nextLocalNetworkState] =
          await Promise.all([
            checkCameraPermission().catch(() => "unknown" as const),
            (probeLocalNetwork
              ? refreshStoredLocalNetworkPermission()
              : readStoredLocalNetworkPermission()
            ).catch(() => LOCAL_NETWORK_FALLBACK_STATE),
          ]);

        if (!canUpdateScreen()) return;
        setCameraPermissionStatus(nextCameraPermissionStatus);
        setLocalNetworkState(nextLocalNetworkState);
      } catch {
        // Permission status is auxiliary; keep the previous values if refresh fails.
      }
    },
    [canUpdateScreen]
  );

  const fetchData = React.useCallback(async () => {
    if (loadingRef.current || !canUpdateScreen()) return;
    loadingRef.current = true;
    const shouldShowBlockingLoader =
      !hasLoadedOnceRef.current && !userRef.current;
    blockingLoaderActiveRef.current = shouldShowBlockingLoader;
    if (isMountedRef.current && shouldShowBlockingLoader) setIsLoading(true);
    try {
      const [userResponse, faceIdFlag] = await Promise.all([
        callApi<{ success: boolean; data: UserInfo }>(
          "POST",
          API_ENDPOINTS.GET_INFO,
          {}
        ),
        readFaceIdEnabled(),
      ]);
      if (!canUpdateScreen()) return;
      userRef.current = userResponse.data;
      hasLoadedOnceRef.current = true;
      setUser(userResponse.data);
      setHasLoadedOnce(true);
      setLoadErrorMessage(null);
      setIsFaceIdEnabled(faceIdFlag);
      refreshPermissionState();
    } catch (error: any) {
      if (canUpdateScreen()) {
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
      }
      const isOffline = !error?.response || error?.code === "ECONNABORTED";
      if (
        isOffline ||
        error?.OFFLINE ||
        isAuthExpiredError(error) ||
        !canUpdateScreen()
      ) {
        if (canUpdateScreen() && !isAuthExpiredError(error)) {
          setLoadErrorMessage(
            "Vui lòng kiểm tra kết nối mạng và thử mở lại màn hình này."
          );
        }
        return;
      }

      if (canUpdateScreen()) {
        setLoadErrorMessage("Không thể tải dữ liệu tài khoản hiện tại.");
      }
    } finally {
      loadingRef.current = false;
      if (
        blockingLoaderActiveRef.current &&
        isMountedRef.current &&
        isScreenActiveRef.current
      ) {
        setIsLoading(false);
        blockingLoaderActiveRef.current = false;
      }
    }
  }, [canUpdateScreen, isAuthExpiredError, refreshPermissionState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocusedRef.current) {
        if (isFaceIdPromptActiveRef.current) return;
        refreshPermissionState(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermissionState]);

  useEffect(() => {
    if (!isFocused) {
      isScreenActiveRef.current = false;
      return;
    }
    isScreenActiveRef.current = true;
    fetchData();
    return () => {
      isScreenActiveRef.current = false;
    };
  }, [fetchData, isFocused]);

  useNetworkAwareReload(
    () => {
      fetchData();
    },
    {
      enabled: isFocused,
      hasError: Boolean(loadErrorMessage),
      onOffline: () => {
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng và thử mở lại màn hình này."
        );
      },
    }
  );

  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;
    if (!value) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      await writeFaceIdEnabled(false);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }
    try {
      const { token, refreshToken } = await readStoredAuthTokens();
      if (!isMountedRef.current) return;
      const biometryType = await Keychain.getSupportedBiometryType();
      if (!isMountedRef.current) return;
      if (biometryType !== Keychain.BIOMETRY_TYPE.FACE_ID) {
        Alert.alert(
          "FaceID chưa sẵn sàng",
          "Thiết bị chưa hỗ trợ FaceID hoặc chưa thiết lập FaceID."
        );
        setIsFaceIdEnabled(false);
        return;
      }
      if (!token && !refreshToken) {
        Alert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }
      await Keychain.setGenericPassword(
        FACE_ID_MARKER_USERNAME,
        FACE_ID_MARKER_PASSWORD,
        {
          service: FACE_ID_LOGIN_SERVICE,
          accessControl:
            Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        }
      );
      isFaceIdPromptActiveRef.current = true;
      let confirmation: false | Keychain.UserCredentials = false;
      try {
        confirmation = await Keychain.getGenericPassword({
          service: FACE_ID_LOGIN_SERVICE,
          authenticationPrompt: {
            title: "Xác thực FaceID",
            subtitle: "Xác nhận để bật đăng nhập bằng FaceID",
            description: "Bật đăng nhập nhanh bằng FaceID",
            cancel: "Huỷ",
          },
        });
      } finally {
        isFaceIdPromptActiveRef.current = false;
      }
      if (!confirmation) {
        await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
        setIsFaceIdEnabled(false);
        return;
      }
      await writeFaceIdEnabled(true);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch (err: any) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      const code = err?.code;
      const message = String(err?.message ?? "");
      const normalizedMessage = message.toLowerCase();
      const isCancelled =
        code === -128 ||
        code === "-128" ||
        normalizedMessage.includes("cancel") ||
        message.includes("UserCancel") ||
        err?.name === "LAErrorUserCancel";
      if (!isCancelled) {
        Alert.alert("Lỗi", "Không thể bật FaceID.");
      }
    }
  };

  const handlePressLogout = async () => {
    if (isLoading) return;
    isLoggingOutRef.current = true;
    if (isMountedRef.current) setIsLoading(true);
    try {
      hardResetApi();
      resetAuthState();
      await clearTokenStorage();
      await logout();
      dispatch(clearPermissions());
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const localNetworkStatusLabel = getLocalNetworkPermissionLabel(
    localNetworkState.status
  );
  const cameraStatusLabel = getCameraPermissionLabel(cameraPermissionStatus);
  const localNetworkStatusBackground =
    localNetworkState.status === "granted"
      ? colors.greenLight
      : localNetworkState.status === "denied"
      ? colors.redSurface
      : colors.amberLight;

  const handleToggleLocalNetworkPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingLocalNetworkPermission) return;

      if (Platform.OS === "android") {
        Alert.alert(
          "Quyền mạng nội bộ",
          "Android không có công tắc riêng cho quyền mạng nội bộ. Quyền này đã được mở mặc định để app kết nối server nội bộ."
        );
        const refreshedState = await refreshStoredLocalNetworkPermission();
        setLocalNetworkState(refreshedState);
        return;
      }

      if (!value) {
        Alert.alert(
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
          ]
        );
        return;
      }

      setIsUpdatingLocalNetworkPermission(true);
      try {
        const nextStatus = await requestLocalNetworkPermission();
        const refreshedState = await refreshStoredLocalNetworkPermission();
        setLocalNetworkState({
          ...refreshedState,
          hasRequestedPermission: true,
          status: nextStatus,
        });

        if (nextStatus !== "granted") {
          Alert.alert(
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
            ]
          );
        }
      } catch {
        Alert.alert(
          "Lỗi",
          "Chưa thể cập nhật quyền mạng nội bộ lúc này. Vui lòng thử lại."
        );
      } finally {
        if (isMountedRef.current) setIsUpdatingLocalNetworkPermission(false);
      }
    },
    [isUpdatingLocalNetworkPermission]
  );

  const handleToggleCameraPermission = useCallback(
    async (value: boolean) => {
      if (isUpdatingCameraPermission) return;

      if (!value) {
        Alert.alert(
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
          ]
        );
        return;
      }

      setIsUpdatingCameraPermission(true);
      try {
        const nextStatus = await requestCameraPermission();
        setCameraPermissionStatus(nextStatus);

        if (nextStatus === "blocked") {
          Alert.alert(
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
            ]
          );
          return;
        }

        if (nextStatus === "denied" || nextStatus === "unavailable") {
          Alert.alert(
            "Quyền camera",
            "Chưa thể bật quyền camera trên thiết bị này."
          );
        }
      } catch {
        Alert.alert("Lỗi", "Chưa thể cập nhật quyền camera lúc này.");
      } finally {
        if (isMountedRef.current) setIsUpdatingCameraPermission(false);
      }
    },
    [isUpdatingCameraPermission]
  );

  const closeModal = () => {
    setIsModalVisible(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới phải khác mật khẩu cũ.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await changePasswordApi(oldPassword, newPassword);
      const isChangePasswordSuccess =
        response?.success === true ||
        response?.data === 1 ||
        (typeof response?.data === "object" &&
          response?.data?.success === true);
      const responseMessage =
        response?.message ||
        (typeof response?.data === "object"
          ? response?.data?.message
          : undefined) ||
        "Đổi mật khẩu thất bại!";

      if (isChangePasswordSuccess) {
        try {
          const saved = await Keychain.getGenericPassword({
            service: AUTH_LOGIN_SERVICE,
          });
          if (saved) {
            await Keychain.setGenericPassword(saved.username, newPassword, {
              service: AUTH_LOGIN_SERVICE,
              accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
          }
        } catch (storageError) {
          warn("[Settings] Update saved password failed:", storageError);
        }

        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal();
      } else {
        Alert.alert("Lỗi", responseMessage);
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") return;
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại."
      );
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  if (isLoading || (!user && !hasLoadedOnce)) {
    return <IsLoading size="large" color={C.red} />;
  }

  if (loadErrorMessage) {
    return (
      <View style={[styles.emptyStateRoot, { backgroundColor: colors.bg }]}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={isDark ? "#09111B" : "#F0F2F8"}
        />
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Cài đặt"
          subtitle={loadErrorMessage}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.emptyStateRoot, { backgroundColor: colors.bg }]}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={isDark ? "#09111B" : "#F0F2F8"}
        />
        <EmptyState
          iconName="person-circle-outline"
          title="Không có thông tin người dùng"
          subtitle="Không thể tải dữ liệu tài khoản hiện tại."
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[C.redLight, C.red, C.redDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.redZone}
        >
          <SettingProfileHeader
            name={user?.moTa}
            avatarUrl={user?.avatarUrl}
            safeTop={insets.top}
          />
          <SettingWaveDivider />
        </LinearGradient>

        <View style={[styles.greyZone, { backgroundColor: colors.bg }]}>
          <SettingSectionGroup title="TÀI KHOẢN">
            <SettingRowItem
              iconName="person-outline"
              iconBg={C.blue}
              label="Hồ sơ cá nhân"
              sublabel="Xem và chỉnh sửa thông tin"
              onPress={() => navigation.navigate("Profile")}
            />
            <SettingRowItem
              iconName="lock-closed-outline"
              iconBg={C.amber}
              label="Đổi mật khẩu"
              sublabel="Cập nhật mật khẩu đăng nhập"
              onPress={() => setIsModalVisible(true)}
            />
            {Platform.OS === "ios" && (
              <SettingSwitchRow
                iconName="face-recognition"
                lib="material-community"
                iconBg={C.violet}
                label="Đăng nhập FaceID"
                sublabel="Dùng nhận diện khuôn mặt"
                value={isFaceIdEnabled}
                onValueChange={handleToggleFaceID}
                isLast
              />
            )}
          </SettingSectionGroup>

          <SettingSectionGroup title="KHÁC">
            <SettingRowItem
              iconName="contrast-outline"
              iconBg={C.violet}
              label="Hiển thị"
              sublabel="Theo thiết bị, giao diện sáng hoặc tối"
              onPress={() => navigation.navigate("Appearance")}
            />
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
            <SettingRowItem
              iconName="log-out-outline"
              label="Đăng xuất"
              sublabel="Thoát khỏi tài khoản hiện tại"
              danger
              isLast
              onPress={() =>
                Alert.alert("Xác nhận", "Bạn muốn đăng xuất?", [
                  { text: "Hủy", style: "cancel" },
                  {
                    text: "Đăng xuất",
                    style: "destructive",
                    onPress: handlePressLogout,
                  },
                ])
              }
            />
          </SettingSectionGroup>

          <View
            style={[
              styles.localNetworkSummary,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.localNetworkStatusBadge,
                { backgroundColor: localNetworkStatusBackground },
              ]}
            >
              <Text
                style={[
                  styles.localNetworkStatusBadgeText,
                  { color: colors.text },
                ]}
              >
                {localNetworkStatusLabel}
              </Text>
            </View>
            <Text
              style={[styles.localNetworkSummaryText, { color: colors.text }]}
            >
              Ứng dụng đã lưu trạng thái quyền mạng nội bộ để hỗ trợ kết nối
              server nội bộ.
            </Text>
            <Text
              style={[
                styles.localNetworkSummaryHint,
                { color: colors.textSub },
              ]}
            >
              Bạn có thể đổi quyền mạng nội bộ và camera trong Cài đặt hệ thống
              bất kỳ lúc nào.
            </Text>
          </View>

          <View style={styles.versionWrap}>
            <Text
              style={[
                styles.versionText,
                {
                  backgroundColor: colors.surface,
                  color: colors.textMuted,
                },
              ]}
            >
              {appVersionLabel}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={isModalVisible}
        isLoading={isLoading}
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onChangeOldPassword={setOldPassword}
        onChangeNewPassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onClose={closeModal}
        onSubmit={handleChangePassword}
      />
    </View>
  );
};

// ─── Global Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyStateRoot: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  redZone: {
    /* gradient applied inline */
  },
  greyZone: { flexGrow: 1, paddingBottom: 48 },
  localNetworkSummary: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  localNetworkStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  localNetworkStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  localNetworkSummaryText: {
    fontSize: 13,
    lineHeight: 20,
  },
  localNetworkSummaryHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  versionWrap: {
    alignItems: "center",
    marginTop: 32,
  },
  versionText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden",
  },
});

export default SettingScreen;
