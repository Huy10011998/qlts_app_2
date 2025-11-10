import React, { useEffect, useState } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import IsLoading from "../../components/ui/IconLoading";
import { changePasswordApi } from "../../services/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { SettingScreenNavigationProp, UserInfo } from "../../types";
import { callApi } from "../../services/data/CallApi";

// Header profile
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

// Item setting
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

const SettingScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserInfo>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigation = useNavigation<SettingScreenNavigationProp>();
  const { setToken } = useAuth();

  // Lấy thông tin user
  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true);
      try {
        const response = await callApi<{ success: boolean; data: UserInfo }>(
          "POST",
          API_ENDPOINTS.GET_INFO,
          {}
        );
        setUser(response.data);
      } catch (error) {
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  // Logout
  const handlePressLogout = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Xóa token và FaceID
      await AsyncStorage.removeItem("token");
      await Keychain.resetGenericPassword();

      // Kiểm tra
      const tokenCheck = await AsyncStorage.getItem("token");

      const credentialsCheck = await Keychain.getGenericPassword();

      // Update context
      setToken(null);

      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await changePasswordApi(oldPassword, newPassword);
      if (response?.success) {
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

  // Danh sách setting
  const settings = [
    {
      iconName: "person-circle-outline",
      label: "Hồ sơ/Profile",
      onPress: () => navigation.navigate("Profile"),
    },
    {
      iconName: "lock-closed-outline",
      label: "Đổi mật khẩu/Change Password",
      onPress: () => setIsModalVisible(true),
    },
    {
      iconName: "log-out-outline",
      label: "Đăng xuất / Log out",
      onPress: () => {
        Alert.alert("Xác nhận đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng xuất",
            style: "destructive",
            onPress: handlePressLogout,
          },
        ]);
      },
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <SettingHeader name={user?.moTa} avatarUrl={user?.avatarUrl} />
        <View style={styles.section}>
          {settings.map((item, index) => (
            <SettingItem key={index} {...item} />
          ))}
        </View>
      </ScrollView>

      {isLoading && <IsLoading size="large" color="#FF3333" />}

      <Modal
        transparent
        animationType="fade"
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu cũ"
              placeholderTextColor="#999"
              secureTextEntry
              textContentType="none"
              autoCorrect={false}
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu mới"
              secureTextEntry
              placeholderTextColor="#999"
              textContentType="none"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu mới"
              secureTextEntry
              placeholderTextColor="#999"
              textContentType="none"
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
  name: { marginTop: 8, fontSize: 16, fontWeight: "bold" },
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

  label: { flex: 1, fontSize: 13, fontWeight: "bold" },

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
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
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
