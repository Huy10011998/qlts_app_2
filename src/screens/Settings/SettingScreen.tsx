import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import IsLoading from "../../components/ui/IconLoading";
import { changePasswordApi } from "../../services/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { StackNavigation, UserInfo } from "../../types";
import {
  callApi,
  clearTokenStorage,
  hardResetApi,
  resetAuthState,
} from "../../services/data/CallApi";
import ReactNativeBiometrics from "react-native-biometrics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearPermissions } from "../../store/PermissionSlice";
import { useAppDispatch } from "../../store/Hooks";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { C } from "../../utils/helpers/colors";
import SettingWaveDivider from "./shared/SettingWaveDivider";
import SettingProfileHeader from "./shared/SettingProfileHeader";
import SettingSectionGroup from "./shared/SettingSectionGroup";
import { SettingRowItem, SettingSwitchRow } from "./shared/SettingRowItem";
import ChangePasswordModal from "./shared/ChangePasswordModal";
import { readStoredAuthTokens } from "../../context/authStorage";

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SettingScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo>();
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;

  const rnBiometrics = useRef(new ReactNativeBiometrics()).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  const navigation = useNavigation<StackNavigation<"Profile">>();
  const { logout, logoutReason } = useAuth();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const userRef = useRef<UserInfo | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);
  const loadingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const isMountedRef = useRef(true);
  const isScreenActiveRef = useRef(false);
  const isFocusedRef = useRef(false);
  const lastErrorAlertAtRef = useRef(0);
  const blockingLoaderActiveRef = useRef(false);

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

  const canUpdateScreen = () =>
    isMountedRef.current &&
    isScreenActiveRef.current &&
    isFocusedRef.current &&
    !isLoggingOutRef.current &&
    logoutReason !== "EXPIRED";

  const showAlertIfActive = (title: string, message: string) => {
    if (!canUpdateScreen()) return;
    const now = Date.now();
    if (now - lastErrorAlertAtRef.current < 1500) return;
    lastErrorAlertAtRef.current = now;
    Alert.alert(title, message);
  };

  const isAuthExpiredError = (error: any) =>
    error?.NEED_LOGIN ||
    error?.response?.status === 401 ||
    error?.response?.status === 403;

  const fetchData = React.useCallback(async () => {
    if (loadingRef.current || !canUpdateScreen()) return;
    loadingRef.current = true;
    const shouldShowBlockingLoader =
      !hasLoadedOnceRef.current && !userRef.current;
    blockingLoaderActiveRef.current = shouldShowBlockingLoader;
    if (isMountedRef.current && shouldShowBlockingLoader) setIsLoading(true);
    try {
      const [response, flag] = await Promise.all([
        callApi<{ success: boolean; data: UserInfo }>(
          "POST",
          API_ENDPOINTS.GET_INFO,
          {},
        ),
        AsyncStorage.getItem(FACE_ID_ENABLED_KEY),
      ]);
      if (!canUpdateScreen()) return;
      userRef.current = response.data;
      hasLoadedOnceRef.current = true;
      setUser(response.data);
      setHasLoadedOnce(true);
      setIsFaceIdEnabled(flag === "1");
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
      )
        return;
      showAlertIfActive("Lỗi", "Không thể tải thông tin người dùng.");
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
  }, []);

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

  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;
    if (!value) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "0");
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }
    try {
      const { token, refreshToken } = await readStoredAuthTokens();
      if (!isMountedRef.current) return;
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!isMountedRef.current) return;
      if (!available) {
        Alert.alert("FaceID", "Thiết bị không hỗ trợ FaceID.");
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
        },
      );
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "1");
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch {
      if (!isMountedRef.current) return;
      Alert.alert("Lỗi", "Không thể bật FaceID.");
      setIsFaceIdEnabled(false);
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
    if (newPassword.length < 4) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 4 ký tự.");
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
      if (response?.success) {
        const saved = await Keychain.getGenericPassword({
          service: AUTH_LOGIN_SERVICE,
        });
        if (saved) {
          await Keychain.setGenericPassword(saved.username, newPassword, {
            service: AUTH_LOGIN_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
        }
        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal();
      } else {
        Alert.alert("Lỗi", response?.message || "Đổi mật khẩu thất bại!");
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") return;
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  if (isLoading || (!user && !hasLoadedOnce)) {
    return <IsLoading size="large" color={C.red} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Red gradient header zone ── */}
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

        {/* ── Grey content zone ── */}
        <View style={styles.greyZone}>
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

          {/* Version tag */}
          <View style={styles.versionWrap}>
            <Text style={styles.versionText}>{appVersionLabel}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Change Password Modal ── */}
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
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  redZone: {
    /* gradient applied inline */
  },
  greyZone: { backgroundColor: C.bg, flexGrow: 1, paddingBottom: 48 },
  versionWrap: {
    alignItems: "center",
    marginTop: 32,
  },
  versionText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
    letterSpacing: 0.5,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden",
  },
});

export default SettingScreen;
