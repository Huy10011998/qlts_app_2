import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import ReactNativeBiometrics from "react-native-biometrics";
import * as Keychain from "react-native-keychain";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/authApi";
import { ThemedView } from "../../components/theme/ThemedView";
import { ThemedTextInput } from "../../components/theme/ThemedTextInput";
import { ThemedText } from "../../components/theme/ThemedText";
import IsLoading from "../../components/ui/IconLoading";
import { useThemeColor } from "../../hooks/useThemeColor";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setToken, setRefreshToken } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const hasTriedFaceID = useRef(false);
  const rnBiometrics = new ReactNativeBiometrics();

  const textColor = useThemeColor({}, "text");

  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

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
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Login error:", error);
      }
      Alert.alert("Đăng nhập thất bại", "Sai tài khoản hoặc mật khẩu.");
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
        <ThemedView style={[styles.contaiContent, { flex: 0.5 }]}>
          <Image
            source={require("../../assets/images/logo-cholimex.jpg")}
            style={styles.logoCholimex}
          />
        </ThemedView>

        <ThemedView style={[styles.contaiInput, { flex: 0.5 }]}>
          <ThemedTextInput
            placeholder="Tài khoản"
            value={userName}
            onChangeText={setUserName}
          />
          <ThemedView style={styles.contaiInputPW}>
            <ThemedTextInput
              secureTextEntry={!isPasswordVisible}
              placeholder="Mật khẩu"
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
                style={[styles.iconEye, { tintColor: textColor }]}
              />
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.rowContainer}>
            <TouchableOpacity
              style={[styles.btnContai, isLoginDisabled && styles.disabledBtn]}
              onPress={handlePressLogin}
              disabled={isLoginDisabled}
            >
              <ThemedText type="default">Đăng nhập</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconFaceID}
              onPress={handleFaceIDLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <IsLoading />
              ) : (
                <Image
                  source={require("../../assets/images/faceid-icon2.png")}
                  style={styles.faceIDIcon}
                />
              )}
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
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
  contaiInput: {
    width: "100%",
    padding: 16,
  },
  logoCholimex: {
    resizeMode: "contain",
    width: 300,
    height: 150,
  },
  contaiInputPW: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
  },
  iconEyeContainer: {
    position: "absolute",
    right: 10,
  },
  iconEye: {
    width: 25,
    height: 25,
  },
  btnContai: {
    borderRadius: 8,
    width: "80%",
    height: 60,
    padding: 20,
    backgroundColor: "#FF3333",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.6,
    backgroundColor: "#cccccc",
  },
  iconFaceID: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  faceIDIcon: {
    width: 50,
    height: 50,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
  },
});
