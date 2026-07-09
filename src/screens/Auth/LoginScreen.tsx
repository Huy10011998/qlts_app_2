import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Keychain from "react-native-keychain";
import DeviceInfo from "react-native-device-info";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/auth/authApi";
import IsLoading from "../../components/ui/IconLoading";
import {
  hardResetApi,
  refreshTokenFlow,
  setRefreshInApi,
  shouldRefreshAccessToken,
} from "../../services/data/callApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { log } from "../../utils/Logger";
import {
  readStoredAuthTokens,
  writeStoredAuthUsername,
} from "../../context/authStorage";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  LocalNetworkPermissionStatus,
  getLocalNetworkPermissionLabel,
  readStoredLocalNetworkPermission,
  refreshStoredLocalNetworkPermission,
  requestLocalNetworkPermission,
} from "../../services/localNetworkPermission";
import {
  checkServerReachability,
  SERVER_UNAVAILABLE_MESSAGE,
} from "../../services/network/reachability";

const RED = "#E31E24";
const COMPANY_FOUNDED_YEAR = 1983;
const SUPPORT_EMAIL = "cholimexfood@cholimexfood.com.vn";
const SUPPORT_PHONE = "028 3765 5037";
const SUPPORT_PHONE_LINK = SUPPORT_PHONE.replace(/\s/g, "");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const passwordRef = useRef<TextInput>(null);
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;
  const companyAge = new Date().getFullYear() - COMPANY_FOUNDED_YEAR;
  const { setToken, setRefreshToken, setIosAuthenticated, syncSession, token } =
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [localNetworkStatus, setLocalNetworkStatus] =
    useState<LocalNetworkPermissionStatus>("unknown");

  const isFaceIdRunning = useRef(false);
  const isLocalNetworkRequestRunning = useRef(false);
  const isLocalNetworkDenied = localNetworkStatus === "denied";
  const isLocalNetworkGranted = localNetworkStatus === "granted";
  const localNetworkToneStyle = isLocalNetworkGranted
    ? styles.localNetworkNoticeGranted
    : isLocalNetworkDenied
    ? styles.localNetworkNoticeDenied
    : styles.localNetworkNoticeUnknown;
  const localNetworkIconToneStyle = isLocalNetworkGranted
    ? styles.localNetworkIconGranted
    : isLocalNetworkDenied
    ? styles.localNetworkIconDenied
    : styles.localNetworkIconUnknown;
  const localNetworkStatusToneStyle = isLocalNetworkGranted
    ? styles.localNetworkStatusGranted
    : isLocalNetworkDenied
    ? styles.localNetworkStatusDenied
    : styles.localNetworkStatusUnknown;
  const localNetworkIconColor = isLocalNetworkGranted
    ? "#15803D"
    : isLocalNetworkDenied
    ? RED
    : "#64748B";
  const isCompactHeight = windowHeight < 880;
  const isShortHeight = windowHeight < 760;
  const heroRatio = isShortHeight ? 0.17 : isCompactHeight ? 0.18 : 0.2;
  const heroHeight = Math.min(Math.max(windowHeight * heroRatio, 112), 190);
  const restingContentTopPadding = Math.min(
    Math.max(windowHeight * 0.04, 28),
    40,
  );
  const bottomContentPadding = isKeyboardVisible
    ? Math.max(insets.bottom, 16) + 24
    : Math.max(insets.bottom, 10) + (isCompactHeight ? 8 : 16);
  const isContentOverflowing =
    scrollViewportHeight > 0 &&
    scrollContentHeight > scrollViewportHeight + 1;

  useEffect(() => {
    log("LoginScreen mounted, token:", token);
    return () => {
      log("LoginScreen unmounted");
    };
  }, [token]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setIsLoginDisabled(!(userName.trim() && userPassword.trim()));
  }, [userName, userPassword]);

  const openLocalNetworkSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleOpenSupportEmail = useCallback(() => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        "Hỗ trợ đăng nhập hệ thống",
      )}`,
    );
  }, []);

  const handleOpenSupportPhone = useCallback(() => {
    Linking.openURL(`tel:${SUPPORT_PHONE_LINK}`);
  }, []);

  const applyLocalNetworkStatus = useCallback(
    (status: LocalNetworkPermissionStatus) => {
      setLocalNetworkStatus(status);
    },
    [],
  );

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

  const handleLocalNetworkPermission = useCallback(async () => {
    if (isLocalNetworkRequestRunning.current) return;

    isLocalNetworkRequestRunning.current = true;
    try {
      const status = await requestLocalNetworkPermission();
      applyLocalNetworkStatus(status);
    } catch {
      Alert.alert(
        "Không thể yêu cầu quyền",
        "Ứng dụng chưa thể kiểm tra quyền mạng nội bộ lúc này.",
      );
    } finally {
      isLocalNetworkRequestRunning.current = false;
    }
  }, [applyLocalNetworkStatus]);

  const syncLocalNetworkState = useCallback(async () => {
    const currentState = await readStoredLocalNetworkPermission();

    if (!currentState.hasRequestedPermission) {
      await handleLocalNetworkPermission();
      return;
    }

    const refreshedState = await refreshStoredLocalNetworkPermission();
    applyLocalNetworkStatus(refreshedState.status);
  }, [applyLocalNetworkStatus, handleLocalNetworkPermission]);

  useEffect(() => {
    syncLocalNetworkState();
  }, [syncLocalNetworkState]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          syncLocalNetworkState();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [syncLocalNetworkState]);

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
      await writeStoredAuthUsername(nextUserName);
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
      const responseData = err.response?.data;
      const message =
        (typeof responseData === "string" ? responseData : undefined) ||
        responseData?.message;
      if (status === 401) {
        Alert.alert(
          "Đăng nhập thất bại",
          message || "Sai tài khoản hoặc mật khẩu.",
        );
      } else if (!err.response) {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
      } else {
        Alert.alert(
          "Lỗi đăng nhập",
          message ||
            `Không thể đăng nhập lúc này${
              status ? ` (mã lỗi ${status})` : ""
            }. Vui lòng thử lại.`,
        );
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
      const reachability = await checkServerReachability();
      if (!reachability.canReachServer) {
        Alert.alert("Lỗi", SERVER_UNAVAILABLE_MESSAGE);
        return;
      }

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
      if (storedToken && !shouldRefreshAccessToken(storedToken)) {
        await restoreStoredSession(storedToken, storedRefreshToken ?? null);
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
      const message = String(err?.message ?? "");
      const normalizedMessage = message.toLowerCase();
      const isCancelled =
        code === -128 ||
        code === "-128" ||
        normalizedMessage.includes("cancel") ||
        message.includes("UserCancel") ||
        err?.name === "LAErrorUserCancel";
      const status = err?.response?.status;
      const needsLogin = err?.NEED_LOGIN === true;
      if (isCancelled) return;
      if (needsLogin || status === 401 || status === 403) {
        Alert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      if (!err?.response) {
        const reachability = await checkServerReachability();
        if (!reachability.canReachServer) {
          Alert.alert("Lỗi", SERVER_UNAVAILABLE_MESSAGE);
          return;
        }
      }
      if (!err?.response) {
        Alert.alert(
          "Không thể dùng FaceID",
          "Thiết bị chưa sẵn sàng cho FaceID hoặc ứng dụng chưa được phép sử dụng FaceID trong Cài đặt. Vui lòng đăng nhập bằng mật khẩu và kiểm tra lại quyền FaceID.",
        );
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
          {/* ── RED HERO (responsive) ── */}
          <View
            style={[
              styles.heroBg,
              {
                height: heroHeight,
                paddingBottom: isCompactHeight ? 10 : 16,
              },
            ]}
          >
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <View style={styles.logoBlock}>
              <View
                style={[
                  styles.brandPill,
                  isCompactHeight && styles.brandPillCompact,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={11}
                  color="rgba(255,255,255,0.86)"
                />
                <Text style={styles.brandPillText}>Cholimex Platform</Text>
              </View>
              <View
                style={[
                  styles.logoShadowWrap,
                  isCompactHeight && styles.logoShadowWrapCompact,
                ]}
              >
                <Image
                  source={require("../../assets/images/logo-cholimex.jpg")}
                  style={[styles.logo, isCompactHeight && styles.logoCompact]}
                />
              </View>
              {!isShortHeight && (
                <Text
                  style={[
                    styles.heroTagline,
                    isCompactHeight && styles.heroTaglineCompact,
                  ]}
                >
                  Nền tảng quản lý và vận hành
                </Text>
              )}
            </View>
          </View>

          {/* ── FORM CARD (scroll để không bị che) ── */}
          <View style={styles.card}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isCompactHeight && styles.scrollContentCompact,
                !isKeyboardVisible &&
                  isCompactHeight &&
                  { paddingTop: restingContentTopPadding },
                { paddingBottom: bottomContentPadding },
              ]}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={isKeyboardVisible || isContentOverflowing}
              showsVerticalScrollIndicator={false}
              bounces={false}
              onLayout={(event) =>
                setScrollViewportHeight(event.nativeEvent.layout.height)
              }
              onContentSizeChange={(_, height) => setScrollContentHeight(height)}
            >
              <View
                style={[
                  styles.cardHeader,
                  isCompactHeight && styles.cardHeaderCompact,
                ]}
              >
                <Text
                  style={[
                    styles.cardTitle,
                    isCompactHeight && styles.cardTitleCompact,
                  ]}
                >
                  Đăng nhập
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    isCompactHeight && styles.cardSubtitleCompact,
                  ]}
                >
                  Đăng nhập để tiếp tục sử dụng hệ thống
                </Text>
              </View>

              {/* Username */}
              <View
                style={[
                  styles.inputWrapper,
                  isCompactHeight && styles.inputWrapperCompact,
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
                  style={[
                    styles.textInput,
                    isCompactHeight && styles.textInputCompact,
                  ]}
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
                  isCompactHeight && styles.inputWrapperCompact,
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
                  style={[
                    styles.textInput,
                    isCompactHeight && styles.textInputCompact,
                  ]}
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
              <View
                style={[
                  styles.actionsRow,
                  isCompactHeight && styles.actionsRowCompact,
                ]}
              >
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

              {(Platform.OS === "ios" || Platform.OS === "android") && (
                <View
                  style={[styles.localNetworkNotice, localNetworkToneStyle]}
                >
                  <View
                    style={[
                      styles.localNetworkIconWrap,
                      localNetworkIconToneStyle,
                    ]}
                  >
                    <Ionicons
                      name={
                        isLocalNetworkGranted
                          ? "checkmark-circle"
                          : "wifi-outline"
                      }
                      size={15}
                      color={localNetworkIconColor}
                    />
                  </View>
                  <View style={styles.localNetworkTextWrap}>
                    <Text style={styles.localNetworkLabel}>Mạng nội bộ</Text>
                    <Text
                      style={[
                        styles.localNetworkStatusText,
                        localNetworkStatusToneStyle,
                      ]}
                    >
                      {getLocalNetworkPermissionLabel(localNetworkStatus)}
                    </Text>
                  </View>
                  {Platform.OS === "ios" && isLocalNetworkDenied && (
                    <TouchableOpacity
                      style={styles.localNetworkSettingsButton}
                      onPress={openLocalNetworkSettings}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="settings-outline" size={15} color={RED} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View
                style={[
                  styles.supportCard,
                  isCompactHeight && styles.supportCardCompact,
                ]}
              >
                <View
                  style={[
                    styles.supportActions,
                    isCompactHeight && styles.supportActionsCompact,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.supportAction}
                    onPress={handleOpenSupportEmail}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="mail-outline" size={15} color="#B91C1C" />
                    <Text style={styles.supportActionText} numberOfLines={1}>
                      {SUPPORT_EMAIL}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.supportAction}
                    onPress={handleOpenSupportPhone}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="call-outline" size={15} color="#15803D" />
                    <Text style={styles.supportActionText} numberOfLines={1}>
                      {SUPPORT_PHONE}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info chips — chuyển xuống form cho gọn hero */}
              {!isCompactHeight && (
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
              )}

              {/* Footer */}
              <View
                style={[styles.footer, isCompactHeight && styles.footerCompact]}
              >
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

  // ── Hero ──
  heroBg: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
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
  brandPillCompact: {
    marginBottom: 7,
    paddingVertical: 4,
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
  logoShadowWrapCompact: {
    borderRadius: 14,
  },
  logo: {
    width: 176,
    height: 88,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  logoCompact: {
    width: 142,
    height: 70,
    borderRadius: 14,
  },
  heroTagline: {
    marginTop: 10,
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  heroTaglineCompact: {
    marginTop: 6,
    fontSize: 10,
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
  scrollContentCompact: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },

  // Card header
  cardHeader: {
    marginBottom: 10,
  },
  cardHeaderCompact: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardTitleCompact: {
    fontSize: 23,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9AA3AF",
    lineHeight: 20,
  },
  cardSubtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputWrapperCompact: {
    minHeight: 44,
    marginBottom: 9,
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
    height: 48,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    fontSize: 14,
    color: "#111",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textInputCompact: {
    height: 44,
  },

  // ── Buttons ──
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  actionsRowCompact: {
    marginTop: 2,
  },
  loginBtn: {
    flex: 1,
    height: 45,
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
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  faceIdBtn: {
    width: 45,
    height: 45,
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
  localNetworkNotice: {
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    shadowColor: "#7F1D1D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  localNetworkNoticeGranted: {
    backgroundColor: "#F4FBF6",
    borderColor: "#BFE8C9",
  },
  localNetworkNoticeDenied: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  localNetworkNoticeUnknown: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  localNetworkIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  localNetworkIconGranted: {
    backgroundColor: "#DCFCE7",
  },
  localNetworkIconDenied: {
    backgroundColor: "#FEE2E2",
  },
  localNetworkIconUnknown: {
    backgroundColor: "#E2E8F0",
  },
  localNetworkTextWrap: {
    flex: 1,
    gap: 1,
  },
  localNetworkLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  localNetworkStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  localNetworkStatusGranted: {
    color: "#15803D",
  },
  localNetworkStatusDenied: {
    color: "#B91C1C",
  },
  localNetworkStatusUnknown: {
    color: "#475569",
  },
  localNetworkSettingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  supportCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#FFF8F8",
    borderWidth: 1,
    borderColor: "#FAD1D1",
  },
  supportCardCompact: {
    marginTop: 9,
    padding: 8,
    borderRadius: 14,
  },
  supportActions: {
    gap: 8,
  },
  supportActionsCompact: {
    gap: 8,
  },
  supportAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3E3E3",
  },
  supportActionText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  footerCompact: {
    marginTop: 12,
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
