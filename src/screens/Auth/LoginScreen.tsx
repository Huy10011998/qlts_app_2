import React, { useCallback, useEffect, useState, useRef } from "react";
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
import * as Keychain from "react-native-keychain";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/AuthApi";
import IsLoading from "../../components/ui/IconLoading";
import { getPermission } from "../../services/Index";
import { setPermissions } from "../../store/PermissionSlice";
import {
  hardResetApi,
  refreshTokenFlow,
  setRefreshInApi,
  setTokenInApi,
  shouldRefreshAccessToken,
} from "../../services/data/CallApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppDispatch } from "../../store/Hooks";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
} from "../../constants/AuthStorage";

const FACE_ID_REFRESH_LEEWAY_MS = 60 * 1000;

export default function LoginScreen() {
  const {
    logout,
    logoutReason,
    setToken,
    setRefreshToken,
    setIosAuthenticated,
  } = useAuth();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [isTokenReady, setIsTokenReady] = useState(false);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  const isFaceIDRunning = useRef(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

  // PREP TOKEN + SYNC KEYCHAIN
  const prepareTokenForFaceID = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);

      if (enabled !== "1") {
        await Keychain.resetGenericPassword({
          service: FACE_ID_LOGIN_SERVICE,
        });
        setIsFaceIdEnabled(false);
        setIsTokenReady(true);
        return;
      }

      setIsFaceIdEnabled(true);

      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("refreshToken"),
      ]);

      if (!storedAccessToken || !storedRefreshToken) {
        setIsTokenReady(true);
        return;
      }

      if (logoutReason === "EXPIRED") {
        setIsTokenReady(true);
        return;
      }

      setRefreshInApi(storedRefreshToken);

      const needsRefresh = shouldRefreshAccessToken(
        storedAccessToken,
        FACE_ID_REFRESH_LEEWAY_MS,
      );

      if (needsRefresh) {
        setIsLoading(true);
        try {
          const refreshed = await refreshTokenFlow();
          await setToken(refreshed);
          setTokenInApi(refreshed);
        } catch (err: any) {
          const needLogin =
            err?.NEED_LOGIN ||
            err?.response?.status === 401 ||
            err?.response?.status === 403;

          if (needLogin) {
            await logout("EXPIRED");
            return;
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setTokenInApi(storedAccessToken);
      }
    } catch {
      // ignore
    } finally {
      setIsTokenReady(true);
    }
  }, [logout, logoutReason, setToken]);

  useEffect(() => {
    if (Platform.OS === "ios") {
      prepareTokenForFaceID();
    } else {
      setIsTokenReady(true);
    }
  }, [prepareTokenForFaceID]);

  // LOGIN THƯỜNG
  const handlePressLogin = async () => {
    if (isLoading) return;

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      hardResetApi();
      const res = await loginApi(userName, userPassword);

      if (res?.data?.accessToken) {
        await setToken(res.data.accessToken);
        await setRefreshToken(res.data.refreshToken ?? null);

        setTokenInApi(res.data.accessToken);
        setRefreshInApi(res.data.refreshToken ?? null);

        await Keychain.setGenericPassword(userName, userPassword, {
          service: AUTH_LOGIN_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });

        const permissionRes = await getPermission();
        dispatch(setPermissions(permissionRes.data));

        if (Platform.OS === "ios") {
          setIosAuthenticated(true);
        }
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 401) {
        Alert.alert(
          "Đăng nhập thất bại",
          message || "Sai tài khoản hoặc mật khẩu.",
        );
      } else if (!err.response) {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
      } else {
        Alert.alert("Lỗi", "Có lỗi xảy ra.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // HANDLE PRESS FACEID (có giải thích)
  const handleFaceIDPress = async () => {
    if (isLoading) return;

    if (!isTokenReady) {
      Alert.alert(
        "Đang chuẩn bị",
        "Ứng dụng đang chuẩn bị FaceID. Vui lòng đợi.",
      );
      return;
    }

    if (!isFaceIdEnabled) {
      Alert.alert(
        "FaceID chưa bật",
        "Bạn cần đăng nhập và bật FaceID trong Cài đặt.",
      );
      return;
    }

    handleFaceIDLogin();
  };

  // LOGIN FACEID
  const handleFaceIDLogin = async () => {
    if (isFaceIDRunning.current) return;
    isFaceIDRunning.current = true;

    try {
      const credentials = await Keychain.getGenericPassword({
        service: FACE_ID_LOGIN_SERVICE,
        authenticationPrompt: {
          title: "Xác thực",
          subtitle: "Sử dụng FaceID để đăng nhập",
          description: "Đăng nhập bằng FaceID",
          cancel: "Huỷ",
        },
      });

      if (!credentials) {
        Alert.alert("FaceID", "Không tìm thấy thông tin đăng nhập.");
        return;
      }

      setIosAuthenticated(true);
    } catch (err: any) {
      const code = err?.code;
      const isCancelled = code === -128 || code === "-128";
      if (!isCancelled) {
        Alert.alert("Lỗi", "Không thể đăng nhập bằng FaceID.");
      }
    } finally {
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
              placeholderTextColor={"#888"}
              value={userName}
              onChangeText={setUserName}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!isPasswordVisible}
              placeholder="Mật khẩu"
              placeholderTextColor={"#888"}
              value={userPassword}
              onChangeText={setUserPassword}
            />

            <TouchableOpacity
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
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={[
                    styles.faceID,
                    (!isTokenReady || !isFaceIdEnabled) && { opacity: 0.5 },
                  ]}
                  onPress={handleFaceIDPress}
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

                {/* Hint text */}
                {(!isFaceIdEnabled || !isTokenReady) && (
                  <Text style={styles.hint}>
                    {!isFaceIdEnabled ? "Chưa bật FaceID" : "Đang chuẩn bị..."}
                  </Text>
                )}
              </View>
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
  },
  textInput: { flex: 1, fontSize: 15, color: "#333" },
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
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
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
  hint: { fontSize: 12, color: "#999", marginTop: 4, fontWeight: "bold" },
});
