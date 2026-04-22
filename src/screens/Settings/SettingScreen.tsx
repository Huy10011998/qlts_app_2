import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  Switch,
  Platform,
} from "react-native";
import * as Keychain from "react-native-keychain";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearPermissions } from "../../store/PermissionSlice";
import { useAppDispatch } from "../../store/Hooks";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
} from "../../constants/AuthStorage";

// HEADER COMPONENT
const SettingHeader: React.FC<{ name?: string; avatarUrl?: string }> = ({
  name,
  avatarUrl,
}) => (
  <View style={styles.profileHeader}>
    <View style={styles.avatar}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={60} color="#FF3333" />
      )}
    </View>
    <Text style={styles.name}>{name || "---"}</Text>
  </View>
);

// ITEM BUTTON
const SettingItem: React.FC<{
  iconName: string;
  label: string;
  onPress: () => void;
}> = ({ iconName, label, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.iconWrapper}>
      <Ionicons name={iconName} size={22} color="#fff" />
    </View>
    <Text style={styles.label}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

// ITEM SWITCH
const SettingSwitchItem: React.FC<{
  iconName: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ iconName, label, value, onValueChange }) => (
  <View style={styles.settingItem}>
    <View style={styles.iconWrapper}>
      <Ionicons name={iconName} size={22} color="#fff" />
    </View>
    <Text style={styles.label}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

const SettingScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo>();

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // FIX: dùng ref để tránh user vào deps của useCallback gây loop
  const userRef = useRef<UserInfo | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);

  const loadingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const isMountedRef = useRef(true);
  const isScreenActiveRef = useRef(false);
  const isFocusedRef = useRef(false);
  const lastErrorAlertAtRef = useRef(0);
  // FIX: ref theo dõi blocking loader để tránh stale closure trong finally
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

  // FIX: bỏ `user` khỏi deps, dùng userRef thay thế để tránh re-create loop
  const fetchData = React.useCallback(async () => {
    if (loadingRef.current || !canUpdateScreen()) return;

    loadingRef.current = true;

    const shouldShowBlockingLoader =
      !hasLoadedOnceRef.current && !userRef.current;
    blockingLoaderActiveRef.current = shouldShowBlockingLoader;

    if (isMountedRef.current && shouldShowBlockingLoader) {
      setIsLoading(true);
    }

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
      ) {
        return;
      }

      showAlertIfActive("Lỗi", "Không thể tải thông tin người dùng.");
    } finally {
      loadingRef.current = false;
      // FIX: dùng blockingLoaderActiveRef thay vì closure variable
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

  // FIX: thêm isMountedRef guard sau mỗi await quan trọng
  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;

    if (!value) {
      // Tắt FaceID
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "0");
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }

    try {
      const saved = await Keychain.getGenericPassword({
        service: AUTH_LOGIN_SERVICE,
      });

      if (!isMountedRef.current) return;

      const { available } = await rnBiometrics.isSensorAvailable();

      if (!isMountedRef.current) return;

      if (!available) {
        Alert.alert("FaceID", "Thiết bị không hỗ trợ FaceID.");
        setIsFaceIdEnabled(false);
        return;
      }

      if (!saved) {
        Alert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }

      await Keychain.setGenericPassword(saved.username, saved.password, {
        service: FACE_ID_LOGIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });

      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "1");

      if (!isMountedRef.current) return;

      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch (error) {
      if (!isMountedRef.current) return;
      Alert.alert("Lỗi", "Không thể bật FaceID.");
      setIsFaceIdEnabled(false);
    }
  };

  // LOGOUT
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
      // FIX: không cần setIsFaceIdEnabled vì component sắp unmount sau logout
    } finally {
      // FIX: guard trước khi setState sau logout (component có thể đã unmount)
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  // FIX: helper reset modal state dùng chung cho cả nút Hủy và back gesture
  const closeModal = () => {
    setIsModalVisible(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // CHANGE PASSWORD
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
        // Cập nhật mật khẩu vào Keychain
        const saved = await Keychain.getGenericPassword({
          service: AUTH_LOGIN_SERVICE,
        });

        if (saved) {
          await Keychain.setGenericPassword(saved.username, newPassword, {
            service: AUTH_LOGIN_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });

          if (isFaceIdEnabled) {
            await Keychain.setGenericPassword(saved.username, newPassword, {
              service: FACE_ID_LOGIN_SERVICE,
              accessControl:
                Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
              accessible:
                Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
            });
          }
        }

        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal(); // FIX: dùng closeModal để reset toàn bộ input
      } else {
        Alert.alert("Lỗi", response?.message || "Đổi mật khẩu thất bại!");
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") {
        return;
      }
      const message =
        error.response?.data?.message ||
        "Không thể đổi mật khẩu. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  if (isLoading || (!user && !hasLoadedOnce)) {
    return <IsLoading size="large" color="#FF3333" />;
  }

  // UI RENDER
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <SettingHeader name={user?.moTa} avatarUrl={user?.avatarUrl} />

        <View style={styles.section}>
          <SettingItem
            iconName="person-circle-outline"
            label="Hồ sơ / Profile"
            onPress={() => navigation.navigate("Profile")}
          />

          <SettingItem
            iconName="lock-closed-outline"
            label="Đổi mật khẩu / Change Password"
            onPress={() => setIsModalVisible(true)}
          />

          {Platform.OS === "ios" && (
            <SettingSwitchItem
              iconName="finger-print-outline"
              label="Đăng nhập bằng FaceID"
              value={isFaceIdEnabled}
              onValueChange={handleToggleFaceID}
            />
          )}

          <SettingItem
            iconName="log-out-outline"
            label="Đăng xuất / Log out"
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
        </View>
      </ScrollView>

      {/* Modal đổi mật khẩu */}
      <Modal
        transparent
        animationType="fade"
        visible={isModalVisible}
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeModal} // FIX: reset input khi đóng bằng back gesture
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

            <TextInput
              style={[styles.input, { color: "#333" }]}
              placeholder="Mật khẩu cũ"
              placeholderTextColor="#999"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />

            <TextInput
              style={[styles.input, { color: "#333" }]}
              placeholder="Mật khẩu mới"
              placeholderTextColor="#999"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={[styles.input, { color: "#333" }]}
              placeholder="Xác nhận mật khẩu mới"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={closeModal} // FIX: dùng closeModal
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// STYLE
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  profileHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  name: { marginTop: 8, fontSize: 16, fontWeight: "bold", color: "#333" },
  section: { paddingHorizontal: 16 },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  label: { flex: 1, fontSize: 13, fontWeight: "bold", color: "#333" },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    paddingVertical: 12,
    color: "#333",
    marginBottom: 12,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },

  cancelButton: { backgroundColor: "#ccc" },
  confirmButton: { backgroundColor: "#FF3333" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});

export default SettingScreen;
