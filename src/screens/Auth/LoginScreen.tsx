import {
  C,
  useAccentBorderColors,
  useHairlineBorderColor,
} from "../../utils/helpers/colors";
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
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../constants/AuthStorage";
import { log } from "../../utils/Logger";
import {
  readStoredAuthTokens,
  writeStoredAuthUsername,
} from "../../context/authStorage";
import { readFaceIdEnabled } from "../../services/auth/faceIdFlag";
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
import { styles } from "./LoginScreen.styles";

const RED = C.red;
const COMPANY_FOUNDED_YEAR = 1983;
const SUPPORT_EMAIL = "cholimexfood@cholimexfood.com.vn";
const SUPPORT_PHONE = "028 3765 5037";
const SUPPORT_PHONE_LINK = SUPPORT_PHONE.replace(/\s/g, "");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();
  const {
    height: windowHeight,
    width: windowWidth,
    fontScale,
  } = useWindowDimensions();
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
    ? [styles.localNetworkNoticeGranted, { borderColor: accentBorders.green }]
    : isLocalNetworkDenied
    ? [styles.localNetworkNoticeDenied, { borderColor: accentBorders.amber }]
    : [styles.localNetworkNoticeUnknown, { borderColor: hairlineBorderColor }];
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
  const isNarrowFooter = windowWidth < 330 * Math.min(fontScale, 1.3);
  const heroRatio = isShortHeight ? 0.17 : isCompactHeight ? 0.18 : 0.2;
  const heroHeight = Math.min(Math.max(windowHeight * heroRatio, 112), 190);
  const heroBgStyle = [
    styles.heroBg,
    { height: heroHeight, paddingBottom: isCompactHeight ? 10 : 16 },
  ];
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
      const enabled = await readFaceIdEnabled();
      if (!enabled) {
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
    const enabled = await readFaceIdEnabled();
    if (!enabled) {
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
          <View style={heroBgStyle}>
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
          <View style={[styles.card, { borderColor: hairlineBorderColor }]}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isCompactHeight && styles.scrollContentCompact,
                isCompactHeight && {
                  paddingTop: restingContentTopPadding,
                },
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
                  color={isUsernameFocused ? RED : C.placeholder}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.textInput,
                    isCompactHeight && styles.textInputCompact,
                  ]}
                  placeholder="Tài khoản"
                  placeholderTextColor={C.placeholder}
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
                  color={isPasswordFocused ? RED : C.placeholder}
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
                  placeholderTextColor={C.placeholder}
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
                    color={C.placeholder}
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
                      { borderColor: hairlineBorderColor },
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
                      style={[
                        styles.localNetworkSettingsButton,
                        { borderColor: accentBorders.red },
                      ]}
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
                  { borderColor: accentBorders.red },
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
                    style={[styles.supportAction, { borderColor: accentBorders.red }]}
                    onPress={handleOpenSupportEmail}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="mail-outline" size={15} color="#B91C1C" />
                    <Text
                      style={styles.supportActionText}
                      numberOfLines={2}
                    >
                      {SUPPORT_EMAIL}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.supportAction, { borderColor: accentBorders.red }]}
                    onPress={handleOpenSupportPhone}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="call-outline" size={15} color="#15803D" />
                    <Text
                      style={styles.supportActionText}
                      numberOfLines={1}
                    >
                      {SUPPORT_PHONE}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info chips — luôn hiển thị, màn hình thấp sẽ cuộn khi cần */}
              <View
                style={[
                  styles.infoRow,
                  isCompactHeight && styles.infoRowCompact,
                ]}
              >
                <View
                  style={[
                    styles.infoChip,
                    isCompactHeight && styles.infoChipCompact,
                    { borderColor: accentBorders.red },
                  ]}
                >
                  <Text style={styles.infoLabel}>Thành lập</Text>
                  <Text style={styles.infoValue}>1983</Text>
                </View>
                <View
                  style={[
                    styles.infoChip,
                    isCompactHeight && styles.infoChipCompact,
                    { borderColor: accentBorders.red },
                  ]}
                >
                  <Text style={styles.infoLabel}>Phát triển</Text>
                  <Text style={styles.infoValue}>{companyAge} năm</Text>
                </View>
                <View
                  style={[
                    styles.infoChip,
                    isCompactHeight && styles.infoChipCompact,
                    { borderColor: accentBorders.red },
                    styles.infoChipWide,
                  ]}
                >
                  <Text style={styles.infoLabel}>Danh mục</Text>
                  <Text style={styles.infoValue}>Gia vị · Thực phẩm</Text>
                </View>
              </View>

              {/* Footer */}
              <View
                style={[
                  styles.footer,
                  isCompactHeight && styles.footerCompact,
                  isNarrowFooter && styles.footerNarrow,
                ]}
              >
                <View style={styles.secureRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={C.placeholder}
                  />
                  <Text style={styles.secureText}>Kết nối bảo mật SSL</Text>
                </View>
                {!isNarrowFooter && <View style={styles.footerDot} />}
                <View style={[styles.versionPill, { borderColor: hairlineBorderColor }]}>
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
