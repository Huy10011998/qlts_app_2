import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import ReactNativeBiometrics from "react-native-biometrics";
import * as Keychain from "react-native-keychain";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/AuthApi";
import IsLoading from "../../components/ui/IconLoading";
import { getPermission } from "../../services/Index";
import { setPermissions } from "../../store/PermissionSlice";
import { AppDispatch } from "../../store";
import { useDispatch } from "react-redux";
import { setRefreshInApi, setTokenInApi } from "../../services/data/CallApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const { setToken, setRefreshToken, setIosAuthenticated } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const rnBiometrics = useRef(new ReactNativeBiometrics()).current;

  const dispatch = useDispatch<AppDispatch>();

  // Enable / Disable Login button
  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

  // Reset trạng thái loading khi quay lại màn Login
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // LOGIN THƯỜNG
  const handlePressLogin = async () => {
    if (isLoading) return;

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const res = await loginApi(userName, userPassword);

      if (res?.data?.accessToken) {
        await setToken(res.data.accessToken);
        await setRefreshToken(res.data.refreshToken ?? null);

        setTokenInApi(res.data.accessToken);
        setRefreshInApi(res.data.refreshToken ?? null);

        // Lưu lại login thường (không phải FaceID)
        await Keychain.setGenericPassword(userName, userPassword, {
          service: "user-login",
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        });

        // Lấy quyền
        const permissionRes = await getPermission();
        const listPermission = permissionRes?.data ?? [];

        if (Platform.OS === "ios") {
          setIosAuthenticated(true);
        }

        dispatch(setPermissions(listPermission));
      } else {
        Alert.alert("Lỗi", "Không thể kết nối đến máy chủ.");
      }
    } catch (error) {
      Alert.alert("Đăng nhập thất bại", "Sai tài khoản hoặc mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFaceIDRunning = useRef(false);

  // LOGIN BẰNG FACEID (chỉ dùng Keychain prompt)
  const handleFaceIDLogin = async () => {
    if (isFaceIDRunning.current) return;
    isFaceIDRunning.current = true;

    try {
      // Check user có bật FaceID trong Settings chưa
      const enabled = await AsyncStorage.getItem("faceid-enabled");
      if (enabled !== "1") {
        Alert.alert(
          "FaceID",
          "Bạn chưa bật đăng nhập bằng FaceID trong Cài đặt."
        );
        return;
      }

      // Check sensor (không trigger prompt)
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        Alert.alert("Thiết bị không hỗ trợ FaceID.");
        return;
      }

      // Get credentials → iOS sẽ auto prompt FaceID
      const credentials = await Keychain.getGenericPassword({
        service: "faceid-login",
        authenticationPrompt: {
          title: "Xác thực",
          subtitle: "Sử dụng FaceID để đăng nhập",
          description: "Đăng nhập bằng FaceID",
          cancel: "Huỷ",
        } as any,
      });

      if (!credentials) {
        Alert.alert("FaceID", "Không tìm thấy thông tin đăng nhập FaceID.");
        return;
      }

      setIsLoading(true);

      const response = await loginApi(
        credentials.username,
        credentials.password
      );

      if (response?.data?.accessToken) {
        await setToken(response.data.accessToken);
        await setRefreshToken(response.data.refreshToken ?? null);

        setTokenInApi(response.data.accessToken);
        setRefreshInApi(response.data.refreshToken ?? null);

        const permissionRes = await getPermission();
        dispatch(setPermissions(permissionRes?.data ?? []));

        setIosAuthenticated(true);
      } else {
        Alert.alert("Đăng nhập thất bại", "Sai tài khoản hoặc mật khẩu.");
      }
    } catch (err: any) {
      // iOS: user cancel FaceID → err.code = -128
      if (err?.code === "-128") {
        return; // user huỷ, không cần alert
      }

      Alert.alert("Lỗi", "Không thể đăng nhập bằng FaceID.");
    } finally {
      setIsLoading(false);
      isFaceIDRunning.current = false;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.top, { flex: 0.5 }]}>
          <Image
            source={require("../../assets/images/logo-cholimex.jpg")}
            style={styles.logo}
          />
        </View>

        <View style={[styles.bottom, { flex: 0.5 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Tài khoản"
              placeholderTextColor="#888"
              value={userName}
              onChangeText={setUserName}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!isPasswordVisible}
              placeholder="Mật khẩu"
              placeholderTextColor="#888"
              value={userPassword}
              onChangeText={setUserPassword}
            />

            <TouchableOpacity
              style={styles.iconEyeContainer}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <Image
                source={
                  isPasswordVisible
                    ? require("../../assets/images/iconEye-hide.png")
                    : require("../../assets/images/iconEye-view.png")
                }
                style={styles.iconEye}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, isLoginDisabled && styles.disabledBtn]}
              disabled={isLoginDisabled || isLoading}
              onPress={handlePressLogin}
            >
              <Text style={styles.btnText}>Đăng nhập</Text>
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.faceID}
                onPress={handleFaceIDLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <IsLoading size="large" color="#FF3333" />
                ) : (
                  <Image
                    source={require("../../assets/images/faceid-icon2.png")}
                    style={styles.faceIDIcon}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  top: { justifyContent: "center", alignItems: "center", width: "100%" },
  logo: { resizeMode: "contain", width: 300, height: 150 },
  bottom: { width: "100%", paddingHorizontal: 20 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
    elevation: 2,
  },

  textInput: { flex: 1, fontSize: 15, color: "#333" },
  iconEyeContainer: { padding: 6 },
  iconEye: { width: 22, height: 22 },

  btn: {
    flex: 1,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  disabledBtn: { backgroundColor: "#ccc" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  faceID: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  faceIDIcon: { width: 34, height: 34 },

  row: { flexDirection: "row", alignItems: "center", marginTop: 24 },
});
