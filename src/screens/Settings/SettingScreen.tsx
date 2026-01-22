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
import { useNavigation } from "@react-navigation/native";
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
import { useAutoReload } from "../../hooks/useAutoReload";
import { useAppDispatch } from "../../store/Hooks";

// HEADER COMPONEN
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
// ITEM SWITC
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
  const { logout } = useAuth();

  const dispatch = useAppDispatch();

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // LOAD USER INFO + FACEID
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await callApi<{ success: boolean; data: UserInfo }>(
        "POST",
        API_ENDPOINTS.GET_INFO,
        {},
      );
      setUser(response.data);

      // Load FaceID status
      const flag = await AsyncStorage.getItem("faceid-enabled");
      setIsFaceIdEnabled(flag === "1");
    } catch (error: any) {
      if (error?.NEED_LOGIN) {
        return; // không alert, không set state
      }
      Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // AUTO RELOAD
  useAutoReload(fetchData);

  // FACE ID TOGGLE
  const handleToggleFaceID = async (value: boolean) => {
    if (!value) {
      // Tắt FaceID
      await Keychain.resetGenericPassword({ service: "faceid-login" });
      await AsyncStorage.setItem("faceid-enabled", "0");
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }

    try {
      const saved = await Keychain.getGenericPassword({
        service: "user-login",
      });

      const { available } = await rnBiometrics.isSensorAvailable();
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

      const result = await rnBiometrics.simplePrompt({
        promptMessage: "Xác thực để bật FaceID",
      });

      if (!result.success) {
        setIsFaceIdEnabled(false);
        return;
      }

      await Keychain.setGenericPassword(saved.username, saved.password, {
        service: "faceid-login",
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });

      // Lưu flag tránh auto FaceID khi mở Setting
      await AsyncStorage.setItem("faceid-enabled", "1");

      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể bật FaceID.");
      setIsFaceIdEnabled(false);
    }
  };

  // LOGOUT
  const handlePressLogout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // 0. Reset API state ngay lập tức
      hardResetApi();
      resetAuthState();

      // 1. Clear token
      await clearTokenStorage();

      // 2. Logout auth (context / server / navigation)
      await logout();

      // 3. Clear Redux permissions
      dispatch(clearPermissions());

      // 4. Clear FaceID
      setIsFaceIdEnabled(false);
      await AsyncStorage.removeItem("faceid-enabled");
    } catch (e) {
      Alert.alert("Lỗi", "Không thể đăng xuất.");
    } finally {
      setIsLoading(false);
    }
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
          service: "user-login",
        });

        if (saved) {
          await Keychain.setGenericPassword(saved.username, newPassword, {
            service: "user-login",
          });

          if (isFaceIdEnabled) {
            await Keychain.setGenericPassword(saved.username, newPassword, {
              service: "faceid-login",
              accessControl:
                Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
              accessible:
                Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
            });
          }
        }

        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        setIsModalVisible(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Lỗi", response?.message || "Đổi mật khẩu thất bại!");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Không thể đổi mật khẩu. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !user) {
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
        onRequestClose={() => setIsModalVisible(false)}
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
                onPress={() => setIsModalVisible(false)}
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
  profileHeader: { alignItems: "center", padding: 16 },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
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
