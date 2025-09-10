import React, { useState, useEffect, useRef } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  TextInput,
  Text,
} from "react-native";
import * as Keychain from "react-native-keychain";
import ReactNativeBiometrics from "react-native-biometrics";
import { useNavigation } from "@react-navigation/native";
import { loginApi } from "../../services/auth/authApi";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const hasTriedBiometrics = useRef(false);

  // Disable login button nếu username/password rỗng
  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

  // Auto login với Face ID / Touch ID nếu đã lưu
  useEffect(() => {
    autoLoginWithBiometrics();
  }, []);

  const autoLoginWithBiometrics = async () => {
    if (hasTriedBiometrics.current) return;
    hasTriedBiometrics.current = true;

    const creds = await Keychain.getGenericPassword({
      service: "faceid_login",
    });
    if (!creds) return;

    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) return;

    const result = await rnBiometrics.simplePrompt({
      promptMessage: "Xác thực để đăng nhập",
    });
    if (!result.success) return;

    handleLogin(creds.username, creds.password, false);
  };

  const handleLogin = async (
    username: string,
    password: string,
    askSave = true
  ) => {
    if (isLoading) return;
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const response = await loginApi(username, password);
      if (response?.data?.accessToken) {
        if (askSave) {
          Alert.alert(
            "Lưu đăng nhập?",
            "Bạn có muốn dùng Face ID cho lần sau?",
            [
              { text: "Không", style: "cancel" },
              {
                text: "Có",
                onPress: async () => {
                  await Keychain.setGenericPassword(username, password, {
                    service: "faceid_login",
                  });
                },
              },
            ]
          );
        }
        // navigation.replace("Home"); // uncomment nếu có Home screen
      } else {
        Alert.alert("Lỗi", "Phản hồi không hợp lệ từ server.");
      }
    } catch (error) {
      Alert.alert("Đăng nhập thất bại", "Sai tài khoản hoặc mật khẩu.");
      setUserPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceIDLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      Alert.alert("Thiết bị không hỗ trợ hoặc chưa cài Face ID.");
      setIsLoading(false);
      return;
    }

    const result = await rnBiometrics.simplePrompt({
      promptMessage: "Đăng nhập bằng Face ID",
    });
    if (!result.success) {
      setIsLoading(false);
      return;
    }

    const creds = await Keychain.getGenericPassword({
      service: "faceid_login",
    });
    if (!creds) {
      Alert.alert("Không tìm thấy thông tin đăng nhập đã lưu.");
      setIsLoading(false);
      return;
    }

    handleLogin(creds.username, creds.password, false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo-cholimex.jpg")}
            style={styles.logo}
          />
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Tài khoản"
            value={userName}
            onChangeText={setUserName}
          />

          <View style={styles.inputPasswordContainer}>
            <TextInput
              style={styles.inputPassword}
              secureTextEntry={!isPasswordVisible}
              placeholder="Mật khẩu"
              value={userPassword}
              onChangeText={setUserPassword}
            />
            <TouchableOpacity
              style={styles.iconEyeContainer}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <Text style={{ fontSize: 18 }}>
                {isPasswordVisible ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoginDisabled && styles.disabledButton,
              ]}
              onPress={() => handleLogin(userName, userPassword)}
              disabled={isLoginDisabled}
            >
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.faceIDButton}
              onPress={handleFaceIDLogin}
              disabled={isLoading}
            >
              <Text style={{ fontSize: 30 }}>📱</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 150,
    resizeMode: "contain",
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  inputPasswordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    paddingRight: 10,
  },
  inputPassword: {
    flex: 1,
    padding: 12,
  },
  iconEyeContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  loginButton: {
    flex: 1,
    backgroundColor: "#FF3333",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    marginRight: 10,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: "#ccc",
  },
  loginButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  faceIDButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
});
