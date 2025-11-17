import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import ReactNativeBiometrics from "react-native-biometrics";
import * as Keychain from "react-native-keychain";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/AuthApi";
import IsLoading from "../../components/ui/IconLoading";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setToken, setRefreshToken, token } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const hasTriedFaceID = useRef(false);
  const rnBiometrics = new ReactNativeBiometrics();

  useEffect(() => {
    console.log("===token", token);
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword, token]);

  useEffect(() => {
    const tryAutoLoginWithFaceID = async () => {
      if (hasTriedFaceID.current) return;
      hasTriedFaceID.current = true;

      const credentials = await Keychain.getGenericPassword();
      if (!credentials) return;

      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) return;

      setIsLoading(true);
      try {
        const result = await rnBiometrics.simplePrompt({
          promptMessage: "Xác thực để đăng nhập",
        });

        if (result.success) {
          const response = await loginApi(
            credentials.username,
            credentials.password
          );
          if (response?.data?.accessToken) {
            setToken(response.data.accessToken);
            setRefreshToken(response.data.refreshToken ?? null);
            navigation.replace("Tabs");
          } else {
            Alert.alert("Lỗi", "Phản hồi không hợp lệ từ server.");
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Login error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    tryAutoLoginWithFaceID();
  }, [setToken, setRefreshToken, navigation]);

  const handlePressLogin = async () => {
    if (isLoading) return;
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const response = await loginApi(userName, userPassword);

      if (response?.data?.accessToken) {
        setToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken ?? null);

        Alert.alert(
          "Lưu đăng nhập?",
          "Bạn có muốn sử dụng Face ID để đăng nhập tự động lần sau?",
          [
            {
              text: "Không",
              style: "cancel",
              onPress: () => navigation.replace("Tabs"),
            },
            {
              text: "Có",
              onPress: async () => {
                await Keychain.setGenericPassword(userName, userPassword, {
                  accessible:
                    Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
                });
                navigation.replace("Tabs");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Đăng nhập thất bại",
          "Tên đăng nhập hoặc mật khẩu không đúng."
        );
        setUserPassword("");
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        Alert.alert("Đăng nhập thất bại", "Sai tên đăng nhập hoặc mật khẩu.");
      } else {
        Alert.alert(
          "Đăng nhập thất bại",
          error?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại."
        );
      }

      setUserPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceIDLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        Alert.alert("Thiết bị không hỗ trợ Face ID / Touch ID.");
        return;
      }

      const result = await rnBiometrics.simplePrompt({
        promptMessage: "Đăng nhập bằng Face ID",
      });

      if (!result.success) return;

      const credentials = await Keychain.getGenericPassword();
      if (!credentials) {
        Alert.alert("Không tìm thấy thông tin đăng nhập đã lưu.");
        return;
      }

      const response = await loginApi(
        credentials.username,
        credentials.password
      );
      if (response?.data?.accessToken) {
        setToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken ?? null);
        navigation.replace("Tabs");
      } else {
        Alert.alert("Đăng nhập thất bại", "Phản hồi không hợp lệ từ server.");
      }
    } catch (error) {
      if (__DEV__) {
        console.error("FaceID login error:", error);
      }
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi xác thực Face ID.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.contaiContent, { flex: 0.5 }]}>
          <Image
            source={require("../../assets/images/logo-cholimex.jpg")}
            style={styles.logoCholimex}
          />
        </View>

        <View style={[styles.contaiInput, { flex: 0.5 }]}>
          {/* Username */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Tài khoản"
              placeholderTextColor="#888"
              value={userName}
              onChangeText={setUserName}
            />
          </View>

          {/* Password */}
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
                style={[styles.iconEye]}
              />
            </TouchableOpacity>
          </View>

          {/* Button + FaceID */}
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={[styles.btnContai, isLoginDisabled && styles.disabledBtn]}
              onPress={handlePressLogin}
              disabled={isLoginDisabled}
            >
              <Text style={styles.btnText}>Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconFaceID}
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
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  contaiContent: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  logoCholimex: {
    resizeMode: "contain",
    width: 300,
    height: 150,
  },

  contaiInput: {
    width: "100%",
    paddingHorizontal: 20,
  },

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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },

  iconEyeContainer: {
    padding: 6,
  },

  iconEye: {
    width: 22,
    height: 22,
  },

  btnContai: {
    flex: 1,
    borderRadius: 12,
    height: 55,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
    marginRight: 12,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  disabledBtn: {
    backgroundColor: "#ccc",
  },

  iconFaceID: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },

  faceIDIcon: {
    width: 34,
    height: 34,
  },

  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
});
