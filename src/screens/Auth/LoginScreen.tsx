import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/AuthApi";
import IsLoading from "../../components/ui/IconLoading";
import {
  hardResetApi,
  refreshTokenFlow,
  setRefreshInApi,
  shouldRefreshAccessToken,
} from "../../services/data/CallApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { log } from "../../utils/Logger";
import { readStoredAuthTokens } from "../../context/authStorage";
import Ionicons from "react-native-vector-icons/Ionicons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const RED = "#E31E24";
const COMPANY_FOUNDED_YEAR = 1983;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;
  const companyAge = new Date().getFullYear() - COMPANY_FOUNDED_YEAR;
  const {
    setToken,
    setRefreshToken,
    setIosAuthenticated,
    syncSession,
    token,
    logout,
  } =
    useAuth();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginDisabled, setIsLoginDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isTokenReady, setIsTokenReady] = useState(false);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  const isFaceIdRunning = useRef(false);

  useEffect(() => {
    log("LoginScreen mounted, token:", token);
    return () => {
      log("LoginScreen unmounted");
    };
  }, [token]);

  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

  const prepareTokenForFaceID = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);
      if (enabled !== "1") {
        await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
        setIsFaceIdEnabled(false);
        setIsTokenReady(true);
        return;
      }
      setIsFaceIdEnabled(true);
    } catch {
      // ignore
    } finally {
      setIsTokenReady(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "ios") {
      prepareTokenForFaceID();
    } else {
      setIsTokenReady(true);
    }
  }, [prepareTokenForFaceID]);

  const syncFaceIdMarker = useCallback(async () => {
    if (Platform.OS !== "ios") return;
    const enabled = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);
    if (enabled !== "1") {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      setIsFaceIdEnabled(false);
      return;
    }
    await Keychain.setGenericPassword(
      FACE_ID_MARKER_USERNAME,
      FACE_ID_MARKER_PASSWORD,
      {
        service: FACE_ID_LOGIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      },
    );
    setIsFaceIdEnabled(true);
  }, []);

  const completeLogin = useCallback(
    async (
      accessToken: string,
      refreshToken: string | null | undefined,
      nextUserName: string,
      nextPassword: string,
    ) => {
      await setToken(accessToken);
      await setRefreshToken(refreshToken ?? null);
      await Keychain.setGenericPassword(nextUserName, nextPassword, {
        service: AUTH_LOGIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await syncFaceIdMarker();
      if (Platform.OS === "ios") setIosAuthenticated(true);
    },
    [setIosAuthenticated, setRefreshToken, setToken, syncFaceIdMarker],
  );

  const restoreStoredSession = useCallback(
    async (accessToken: string, refreshToken: string | null) => {
      syncSession(accessToken, refreshToken);
      setIosAuthenticated(true);
    },
    [setIosAuthenticated, syncSession],
  );

  const refreshSessionInBackground = useCallback(async () => {
    try {
      const nextSession = await refreshTokenFlow();
      syncSession(nextSession.accessToken, nextSession.refreshToken);
    } catch (err: any) {
      const status = err?.response?.status;
      const needsLogin = err?.NEED_LOGIN === true;
      if (needsLogin || status === 401 || status === 403) {
        await logout("EXPIRED");
      }
    }
  }, [logout, syncSession]);

  const handlePressLogin = async () => {
    if (isLoading) return;
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      hardResetApi();
      const res = await loginApi(userName, userPassword);
      if (res?.data?.accessToken) {
        await completeLogin(
          res.data.accessToken,
          res.data.refreshToken,
          userName,
          userPassword,
        );
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

  const handleFaceIDPress = async () => {
    if (isLoading) return;
    if (Platform.OS !== "ios") return;
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

  const handleFaceIDLogin = async () => {
    if (Platform.OS !== "ios") return;
    if (isFaceIdRunning.current) return;
    isFaceIdRunning.current = true;
    setIsLoading(true);
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
      const { token: storedToken, refreshToken: storedRefreshToken } =
        await readStoredAuthTokens();
      if (!storedToken && !storedRefreshToken) {
        Alert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      if (storedToken) {
        await restoreStoredSession(storedToken, storedRefreshToken ?? null);
        if (storedRefreshToken && shouldRefreshAccessToken(storedToken)) {
          refreshSessionInBackground();
        }
        return;
      }
      if (!storedRefreshToken) {
        Alert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      setRefreshInApi(storedRefreshToken);
      const nextSession = await refreshTokenFlow();
      await restoreStoredSession(
        nextSession.accessToken,
        nextSession.refreshToken ?? storedRefreshToken,
      );
    } catch (err: any) {
      const code = err?.code;
      const isCancelled = code === -128 || code === "-128";
      const status = err?.response?.status;
      const needsLogin = err?.NEED_LOGIN === true;
      if (isCancelled) return;
      if (needsLogin || status === 401 || status === 403) {
        Alert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      if (!err?.response) {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
        return;
      }
      Alert.alert("Lỗi", "Không thể đăng nhập bằng FaceID.");
    } finally {
      setIsLoading(false);
      isFaceIdRunning.current = false;
    }
  };

  return (
    // KeyboardAvoidingView bao ngoài cùng — đây là key fix
    <KeyboardAvoidingView
      style={styles.kvRoot}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/*
          SafeAreaView chỉ handle top (hero đỏ),
          bottom được handle bởi ScrollView contentInset
        */}
        <SafeAreaView style={styles.root} edges={["top"]}>
          {/* ── RED HERO (compact ~26%) ── */}
          <View
            style={[styles.heroBg, { paddingTop: Math.max(insets.top, 8) + 4 }]}
          >
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <View style={styles.logoBlock}>
              <View style={styles.brandPill}>
                <Ionicons
                  name="sparkles-outline"
                  size={11}
                  color="rgba(255,255,255,0.86)"
                />
                <Text style={styles.brandPillText}>Cholimex Platform</Text>
              </View>
              <View style={styles.logoShadowWrap}>
                <Image
                  source={require("../../assets/images/logo-cholimex.jpg")}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.heroTagline}>
                Nền tảng quản lý và vận hành
              </Text>
            </View>
          </View>

          {/* ── FORM CARD (scroll để không bị che) ── */}
          <View style={styles.card}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Đăng nhập</Text>
                <Text style={styles.cardSubtitle}>
                  Đăng nhập để tiếp tục sử dụng hệ thống
                </Text>
              </View>

              {/* Username */}
              <View
                style={[
                  styles.inputWrapper,
                  isUsernameFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={isUsernameFocused ? RED : "#C0C0C0"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Tài khoản"
                  placeholderTextColor="#C8C8C8"
                  value={userName}
                  onChangeText={setUserName}
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  // Nhảy xuống ô mật khẩu khi bấm Next
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              {/* Password */}
              <View
                style={[
                  styles.inputWrapper,
                  isPasswordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={isPasswordFocused ? RED : "#C0C0C0"}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  secureTextEntry={!isPasswordVisible}
                  placeholder="Mật khẩu"
                  placeholderTextColor="#C8C8C8"
                  value={userPassword}
                  onChangeText={setUserPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handlePressLogin}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#C0C0C0"
                  />
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.loginBtn,
                    isLoginDisabled && styles.loginBtnDisabled,
                  ]}
                  disabled={isLoginDisabled || isLoading}
                  onPress={handlePressLogin}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <IsLoading size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Đăng nhập</Text>
                  )}
                </TouchableOpacity>

                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[
                      styles.faceIdBtn,
                      (!isTokenReady || !isFaceIdEnabled) &&
                        styles.faceIdBtnDimmed,
                    ]}
                    onPress={handleFaceIDPress}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={require("../../assets/images/faceid-icon2.png")}
                      style={styles.faceIDIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Info chips — chuyển xuống form cho gọn hero */}
              <View style={styles.infoRow}>
                <View style={styles.infoChip}>
                  <Text style={styles.infoLabel}>Thành lập</Text>
                  <Text style={styles.infoValue}>1983</Text>
                </View>
                <View style={styles.infoChip}>
                  <Text style={styles.infoLabel}>Phát triển</Text>
                  <Text style={styles.infoValue}>{companyAge} năm</Text>
                </View>
                <View style={[styles.infoChip, styles.infoChipWide]}>
                  <Text style={styles.infoLabel}>Danh mục</Text>
                  <Text style={styles.infoValue}>Gia vị · Thực phẩm</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.secureRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color="#C8C8C8"
                  />
                  <Text style={styles.secureText}>Kết nối bảo mật SSL</Text>
                </View>
                <View style={styles.footerDot} />
                <View style={styles.versionPill}>
                  <Text style={styles.versionText}>
                    {appVersionLabel} · Cholimex Food
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Root ──
  kvRoot: {
    flex: 1,
    backgroundColor: "#fff", // phải là trắng — màu lộ ra phía sau bàn phím
  },
  root: {
    flex: 1,
    backgroundColor: RED, // hero đỏ, card trắng che phần còn lại
  },

  // ── Hero — compact 24% ──
  heroBg: {
    height: SCREEN_HEIGHT * 0.24,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingBottom: 16,
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -80,
    right: -60,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -60,
    left: -40,
  },
  circle3: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.09)",
    top: 60,
    right: 30,
  },
  logoBlock: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  logoShadowWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  logo: {
    width: 176,
    height: 88,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  heroTagline: {
    marginTop: 10,
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    flexGrow: 1,
  },

  // Card header
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9AA3AF",
    lineHeight: 20,
  },

  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputWrapperFocused: {
    borderColor: RED,
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },

  // ── Buttons ──
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  loginBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: {
    backgroundColor: "#E58B8B",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  faceIdBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EFEFEF",
  },
  faceIdBtnDimmed: {
    opacity: 0.4,
  },
  faceIDIcon: {
    width: 28,
    height: 28,
  },

  // ── Info chips (moved to form) ──
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    alignItems: "stretch",
  },
  infoChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FDDEDE",
    alignItems: "center",
  },
  infoChipWide: {
    flex: 1.4,
  },
  infoLabel: {
    fontSize: 10,
    color: "#B05050",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    color: RED,
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  secureText: {
    fontSize: 12,
    color: "#C8C8C8",
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#DEDEDE",
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  versionText: {
    fontSize: 12,
    color: "#B2B8C2",
    fontWeight: "600",
  },
});
