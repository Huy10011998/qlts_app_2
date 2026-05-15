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
  Animated,
  Dimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/AuthApi";
import IsLoading from "../../components/ui/IconLoading";
import {
  hardResetApi,
  refreshTokenFlow,
  setRefreshInApi,
  setTokenInApi,
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const RED = "#E31E24";
const COMPANY_FOUNDED_YEAR = 1983;

export default function LoginScreen() {
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;
  const companyAge = new Date().getFullYear() - COMPANY_FOUNDED_YEAR;
  const { setToken, setRefreshToken, setIosAuthenticated, token, logout } =
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

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

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
      setTokenInApi(accessToken);
      setRefreshInApi(refreshToken ?? null);
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
      await setToken(accessToken);
      await setRefreshToken(refreshToken);
      setTokenInApi(accessToken);
      setRefreshInApi(refreshToken);
      setIosAuthenticated(true);
    },
    [setIosAuthenticated, setRefreshToken, setToken],
  );

  const refreshSessionInBackground = useCallback(async () => {
    try {
      const nextAccessToken = await refreshTokenFlow();
      const { refreshToken: latestRefreshToken } = await readStoredAuthTokens();
      await setToken(nextAccessToken);
      await setRefreshToken(latestRefreshToken ?? null);
      setTokenInApi(nextAccessToken);
      setRefreshInApi(latestRefreshToken ?? null);
    } catch (err: any) {
      const status = err?.response?.status;
      const needsLogin = err?.NEED_LOGIN === true;
      if (needsLogin || status === 401 || status === 403) {
        await logout("EXPIRED");
      }
    }
  }, [logout, setRefreshToken, setToken]);

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
      await setRefreshToken(storedRefreshToken);
      setRefreshInApi(storedRefreshToken);
      const nextAccessToken = await refreshTokenFlow();
      const { refreshToken: latestRefreshToken } = await readStoredAuthTokens();
      await restoreStoredSession(
        nextAccessToken,
        latestRefreshToken ?? storedRefreshToken,
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        {/* ── RED HERO (48%) ── */}
        <View style={styles.heroBg}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />

          <Animated.View style={[styles.logoBlock, { opacity: logoAnim }]}>
            <View style={styles.brandPill}>
              <Ionicons
                name="sparkles-outline"
                size={12}
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
            <Text style={styles.heroTagline}>Nền tảng quản lý và vận hành</Text>
            <View style={styles.heroInfoRow}>
              <View style={styles.heroInfoChip}>
                <Text style={styles.heroInfoLabel}>Thành lập</Text>
                <Text style={styles.heroInfoValue}>1983</Text>
              </View>
              <View style={styles.heroInfoChip}>
                <Text style={styles.heroInfoLabel}>Phát triển</Text>
                <Text style={styles.heroInfoValue}>{companyAge} năm</Text>
              </View>
              <View style={styles.heroInfoChipWide}>
                <Text style={styles.heroInfoLabel}>Danh mục</Text>
                <Text style={styles.heroInfoValue}>Gia vị • Thực phẩm</Text>
              </View>
            </View>
          </Animated.View>

        </View>

        {/* ── FORM CARD ── */}
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <Animated.View
            style={[
              styles.card,
              { opacity: cardOpacity, transform: [{ translateY: cardAnim }] },
            ]}
          >
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSubtitle}>
              Đăng nhập để tiếp tục sử dụng hệ thống
            </Text>

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
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

            {/* ── FOOTER ── */}
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
          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RED,
  },

  // Hero — tăng lên 48%
  heroBg: {
    height: SCREEN_HEIGHT * 0.48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -90,
    right: -70,
  },
  circle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -50,
    left: -50,
  },
  circle3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.09)",
    top: 110,
    right: 34,
  },
  logoBlock: {
    alignItems: "center",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  logoShadowWrap: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: 216,
    height: 108,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderRadius: 18,
  },
  heroTagline: {
    marginTop: 16,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.6,
    fontWeight: "500",
  },
  heroInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 26,
    paddingHorizontal: 24,
  },
  heroInfoChip: {
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
  },
  heroInfoChipWide: {
    minWidth: 154,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
  },
  heroInfoLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.68)",
    fontWeight: "600",
    marginBottom: 2,
  },
  heroInfoValue: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  // Card
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 32,
    marginTop: -22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9AA3AF",
    lineHeight: 20,
    marginBottom: 24,
  },

  // Inputs
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

  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: {
    backgroundColor: "#E58B8B",
    shadowOpacity: 0.12,
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

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    gap: 8,
    paddingTop: 28,
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
