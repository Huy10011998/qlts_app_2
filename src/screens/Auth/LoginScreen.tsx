import {
  C,
  useAccentBorderColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { getTextScaleFactor } from "../../utils/helpers/textScaling";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
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
import { AUTH_LOGIN_SERVICE } from "../../constants/AuthStorage";
import { log } from "../../utils/Logger";
import {
  readStoredAuthTokens,
  readStoredAuthUsername,
  writeStoredAuthUsername,
} from "../../context/authStorage";
import {
  readFaceIdEnabled,
  writeFaceIdEnabled,
} from "../../services/auth/faceIdFlag";
import {
  BiometricKind,
  biometricIcon,
  biometricName,
  classifyBiometricError,
  getBiometricKind,
  getUsableUnlockMethods,
  hasUnlockMethod,
  isDeviceLockAvailable,
  NO_UNLOCK_METHODS,
  promptUnlock,
  resetBiometricMarker,
  unlockMethodName,
  UnlockMethods,
  writeBiometricMarker,
  writeDeviceLockEnabled,
} from "../../services/auth/biometric";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_LINK,
} from "../../constants/support";
import { makeStyles } from "./LoginScreen.styles";
import { AppAlert } from "../../components/ui/AppAlert";

const RED = C.red;
const COMPANY_FOUNDED_YEAR = 1983;

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default function LoginScreen() {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const appVersionLabel = `v${DeviceInfo.getVersion()}`;
  const companyAge = new Date().getFullYear() - COMPANY_FOUNDED_YEAR;
  const { setToken, setRefreshToken, setSessionUnlocked, syncSession, token } =
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
  // Android: loại sinh trắc máy có; `null` = không có / chưa cài. Không có cả
  // sinh trắc lẫn khoá màn hình thì ẩn nút. iOS không dùng — nút Face ID luôn
  // hiện.
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(
    null,
  );
  const [isDeviceLockOnDevice, setIsDeviceLockOnDevice] = useState(false);
  // Android: cách mở khoá đang bật — quyết định icon, câu chữ và hộp hỏi.
  const [unlockMethods, setUnlockMethods] =
    useState<UnlockMethods>(NO_UNLOCK_METHODS);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [localNetworkStatus, setLocalNetworkStatus] =
    useState<LocalNetworkPermissionStatus>("unknown");
  // iOS: mở màn bằng phiên còn hạn + đã bật Face ID thì tự hỏi Face ID một
  // lần, khỏi bắt người dùng bấm nút (xem effect bên dưới). Android không tự
  // hỏi — người dùng bấm icon cạnh nút Đăng nhập.
  const [shouldAutoPromptFaceId, setShouldAutoPromptFaceId] = useState(false);

  const isFaceIdRunning = useRef(false);
  const hasAutoPromptedFaceIdRef = useRef(false);
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
  // Chữ to lên thì nội dung cao thêm mà `windowHeight` không đổi, nên màn hình
  // vẫn rơi vào nhánh "rộng rãi" trong khi thực tế đã chật. Quy về chiều cao
  // hiệu dụng: chia cho hệ số Cỡ chữ của app trước khi so ngưỡng (cỡ chữ của
  // điện thoại thì app bỏ qua).
  const textScale = getTextScaleFactor();
  const effectiveHeight = windowHeight / textScale;
  const isCompactHeight = effectiveHeight < 880;
  const isShortHeight = effectiveHeight < 760;
  const isNarrowFooter = windowWidth < 330 * textScale;
  const heroRatio = isShortHeight ? 0.17 : isCompactHeight ? 0.18 : 0.2;
  const heroHeight = Math.min(Math.max(windowHeight * heroRatio, 112), 190);
  const heroBgStyle = [
    styles.heroBg,
    { height: heroHeight, paddingBottom: isCompactHeight ? 10 : 16 },
  ];
  const restingContentTopPadding = Math.min(
    Math.max(windowHeight * 0.024, 16),
    24,
  );
  const bottomContentPadding = isKeyboardVisible
    ? Math.max(insets.bottom, 16) + 24
    : Math.max(insets.bottom, 10) + (isCompactHeight ? 8 : 16);
  const isContentOverflowing =
    scrollViewportHeight > 0 && scrollContentHeight > scrollViewportHeight + 1;

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

  // Điền sẵn tài khoản lần đăng nhập trước (lưu ở `completeLogin`) cho khỏi gõ
  // lại. Chỉ điền khi ô còn trống — người dùng gõ trước khi đọc xong thì giữ.
  useEffect(() => {
    let isCancelled = false;
    readStoredAuthUsername()
      .then((storedUserName) => {
        if (isCancelled || !storedUserName) return;
        setUserName((current) => current || storedUserName);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

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
      // Android còn kiểm máy vẫn còn vân tay / khuôn mặt / khoá màn hình (mất
      // thì tự tắt cờ).
      const methods =
        Platform.OS === "ios" ? null : await getUsableUnlockMethods();
      if (methods) setUnlockMethods(methods);
      const enabled = methods
        ? hasUnlockMethod(methods)
        : await readFaceIdEnabled();
      if (!enabled) {
        await resetBiometricMarker();
        setIsFaceIdEnabled(false);
        setIsTokenReady(true);
        return;
      }
      setIsFaceIdEnabled(true);
      // Android: thấy màn Đăng nhập trước rồi tự chọn bấm icon hay gõ mật
      // khẩu. Hộp hỏi có khoá màn hình còn không có nút "Dùng mật khẩu".
      if (Platform.OS === "android") return;
      // Tự hỏi Face ID chỉ khi còn phiên để khôi phục — cùng điều kiện
      // `handleFaceIDLogin` dùng. Đăng xuất chủ động thì `logout()` đã xoá cả
      // cờ Face ID lẫn token; hết phiên (EXPIRED) thì token cũng đã bị xoá —
      // cả hai trường hợp đều không tự bật Face ID lên nữa.
      const { token: storedToken, refreshToken: storedRefreshToken } =
        await readStoredAuthTokens();
      if (storedToken || storedRefreshToken) setShouldAutoPromptFaceId(true);
    } catch {
      // ignore
    } finally {
      setIsTokenReady(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "ios") {
      prepareTokenForFaceID();
      return;
    }
    // Android: chỉ máy có vân tay / khuôn mặt / khoá màn hình mới có nút và
    // tự hỏi.
    Promise.all([getBiometricKind(), isDeviceLockAvailable()]).then(
      ([kind, hasDeviceLock]) => {
        setBiometricKind(kind);
        setIsDeviceLockOnDevice(hasDeviceLock);
        if (kind || hasDeviceLock) {
          prepareTokenForFaceID();
        } else {
          setIsTokenReady(true);
        }
      },
    );
  }, [prepareTokenForFaceID]);

  const handleLocalNetworkPermission = useCallback(async () => {
    if (isLocalNetworkRequestRunning.current) return;

    isLocalNetworkRequestRunning.current = true;
    try {
      const status = await requestLocalNetworkPermission();
      applyLocalNetworkStatus(status);
    } catch {
      AppAlert.alert(
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
    if (Platform.OS === "android") {
      // Android không có marker, chỉ đọc lại cờ (máy mất cách mở thì tắt cờ).
      // Marker cũ của bản thử trước thì xoá khi không còn bật gì.
      const methods = await getUsableUnlockMethods();
      if (!hasUnlockMethod(methods)) await resetBiometricMarker();
      setUnlockMethods(methods);
      setIsFaceIdEnabled(hasUnlockMethod(methods));
      return;
    }
    const enabled = await readFaceIdEnabled();
    if (!enabled) {
      await resetBiometricMarker();
      setIsFaceIdEnabled(false);
      return;
    }
    await writeBiometricMarker();
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
      setSessionUnlocked(true);
    },
    [setSessionUnlocked, setRefreshToken, setToken, syncFaceIdMarker],
  );

  const restoreStoredSession = useCallback(
    async (accessToken: string, refreshToken: string | null) => {
      syncSession(accessToken, refreshToken);
      setSessionUnlocked(true);
    },
    [setSessionUnlocked, syncSession],
  );

  // Blur trực tiếp hai input rồi mới đóng keyboard: sau khi chọn mật khẩu gợi ý
  // của iOS Password AutoFill, Keyboard.dismiss() một mình không luôn nhả focus.
  const dismissKeyboardBeforeEnteringApp = useCallback(() => {
    usernameRef.current?.blur();
    passwordRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handlePressLogin = async () => {
    if (isLoading) return;
    dismissKeyboardBeforeEnteringApp();
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
        AppAlert.alert(
          "Đăng nhập thất bại",
          message || "Sai tài khoản hoặc mật khẩu.",
        );
      } else if (!err.response) {
        AppAlert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
      } else {
        AppAlert.alert(
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

  // iOS: "FaceID" (giữ nguyên câu chữ cũ). Android: cách đang bật; chưa bật
  // thì các cách máy có — vd "vân tay hoặc khoá màn hình".
  const biometricLabel =
    Platform.OS === "ios"
      ? biometricName("faceid")
      : unlockMethodName(
          hasUnlockMethod(unlockMethods)
            ? unlockMethods
            : { biometric: !!biometricKind, deviceLock: isDeviceLockOnDevice },
          biometricKind,
        );
  // Android: icon vân tay / khuôn mặt khi sinh trắc đang bật, hoặc chưa bật gì
  // mà máy có sinh trắc; chỉ bật khoá màn hình (hoặc máy chỉ có khoá màn hình)
  // thì icon mẫu hình.
  const androidUnlockIcon =
    biometricKind && (unlockMethods.biometric || !unlockMethods.deviceLock)
      ? biometricIcon(biometricKind)
      : "lock-pattern";

  const handleFaceIDPress = async () => {
    if (isLoading) return;
    if (!isTokenReady) {
      AppAlert.alert(
        "Đang chuẩn bị",
        `Ứng dụng đang chuẩn bị ${biometricLabel}. Vui lòng đợi.`,
      );
      return;
    }
    if (!isFaceIdEnabled) {
      AppAlert.alert(
        `${capitalize(biometricLabel)} chưa bật`,
        `Bạn cần đăng nhập và bật ${biometricLabel} trong Cài đặt.`,
      );
      return;
    }

    handleFaceIDLogin();
  };

  const handleFaceIDLogin = async () => {
    if (isFaceIdRunning.current) return;
    isFaceIdRunning.current = true;
    dismissKeyboardBeforeEnteringApp();
    setIsLoading(true);
    try {
      const reachability = await checkServerReachability();
      if (!reachability.canReachServer) {
        AppAlert.alert("Lỗi", SERVER_UNAVAILABLE_MESSAGE);
        return;
      }

      const unlocked = await promptUnlock(
        Platform.OS === "ios"
          ? {
              title: "Xác thực",
              subtitle: "Sử dụng FaceID để đăng nhập",
              description: "Đăng nhập bằng FaceID",
              cancel: "Huỷ",
            }
          : {
              title: "Đăng nhập",
              subtitle: `Dùng ${biometricLabel} để mở ứng dụng`,
              // Nút phụ của hộp hỏi Android: đóng hộp, ở lại form mật khẩu.
              // Có khoá màn hình thì hệ thống bỏ nút này, bấm ra ngoài để đóng.
              cancel: "Dùng mật khẩu",
            },
        unlockMethods,
      );
      if (!unlocked) {
        AppAlert.alert(
          capitalize(biometricLabel),
          "Không tìm thấy thông tin đăng nhập.",
        );
        return;
      }
      const { token: storedToken, refreshToken: storedRefreshToken } =
        await readStoredAuthTokens();
      if (!storedToken && !storedRefreshToken) {
        AppAlert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      if (storedToken && !shouldRefreshAccessToken(storedToken)) {
        await restoreStoredSession(storedToken, storedRefreshToken ?? null);
        return;
      }
      if (!storedRefreshToken) {
        AppAlert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      setRefreshInApi(storedRefreshToken);
      const nextSession = await refreshTokenFlow();
      await restoreStoredSession(
        nextSession.accessToken,
        nextSession.refreshToken ?? storedRefreshToken,
      );
    } catch (err: any) {
      const biometricError = classifyBiometricError(err);
      const status = err?.response?.status;
      const needsLogin = err?.NEED_LOGIN === true;
      if (biometricError === "cancel") return;
      // Hai nhánh dưới chỉ có trên Android.
      if (biometricError === "lockout") {
        AppAlert.alert(
          "Tạm khoá",
          `Thử ${biometricLabel} sai quá nhiều lần. Vui lòng đăng nhập bằng mật khẩu.`,
        );
        return;
      }
      if (biometricError === "invalidated") {
        await resetBiometricMarker();
        await writeFaceIdEnabled(false);
        await writeDeviceLockEnabled(false);
        setIsFaceIdEnabled(false);
        setUnlockMethods(NO_UNLOCK_METHODS);
        AppAlert.alert(
          `${capitalize(biometricLabel)} trên máy đã thay đổi`,
          `Vui lòng đăng nhập bằng mật khẩu rồi bật lại ${biometricLabel} trong Cài đặt.`,
        );
        return;
      }
      if (needsLogin || status === 401 || status === 403) {
        AppAlert.alert("Phiên đăng nhập đã hết", "Vui lòng đăng nhập lại.");
        return;
      }
      if (!err?.response) {
        const reachability = await checkServerReachability();
        if (!reachability.canReachServer) {
          AppAlert.alert("Lỗi", SERVER_UNAVAILABLE_MESSAGE);
          return;
        }
      }
      if (!err?.response) {
        AppAlert.alert(
          `Không thể dùng ${biometricLabel}`,
          Platform.OS === "ios"
            ? "Thiết bị chưa sẵn sàng cho FaceID hoặc ứng dụng chưa được phép sử dụng FaceID trong Cài đặt. Vui lòng đăng nhập bằng mật khẩu và kiểm tra lại quyền FaceID."
            : "Vui lòng đăng nhập bằng mật khẩu.",
        );
        return;
      }
      AppAlert.alert("Lỗi", `Không thể đăng nhập bằng ${biometricLabel}.`);
    } finally {
      setIsLoading(false);
      isFaceIdRunning.current = false;
    }
  };

  // Effect bên dưới chỉ chạy theo cờ, nên giữ bản `handleFaceIDLogin` mới nhất
  // trong ref thay vì đưa hàm (đổi mỗi lần render) vào deps.
  const handleFaceIDLoginRef = useRef(handleFaceIDLogin);
  handleFaceIDLoginRef.current = handleFaceIDLogin;

  useEffect(() => {
    if (!shouldAutoPromptFaceId || hasAutoPromptedFaceIdRef.current) return;

    const prompt = () => {
      if (hasAutoPromptedFaceIdRef.current) return;
      hasAutoPromptedFaceIdRef.current = true;
      handleFaceIDLoginRef.current();
    };

    // Face ID không hiện được khi app chưa ở foreground (vd mở nền do push) —
    // đợi tới lần app active đầu tiên rồi mới hỏi.
    if (AppState.currentState === "active") {
      prompt();
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") prompt();
    });
    return () => {
      subscription.remove();
    };
  }, [shouldAutoPromptFaceId]);

  return (
    /*
      Android KHÔNG được dùng `behavior`: manifest đã để
      `windowSoftInputMode="adjustResize"` nên hệ thống tự co window khi bàn
      phím mở. Thêm `behavior="height"` là co lần thứ hai — KeyboardAvoidingView
      đo `onLayout` ra chiều cao ĐÃ co rồi lại trừ tiếp chiều cao bàn phím, và
      set cứng `{ height, flex: 0 }`. Tắt bàn phím thì window giãn về full nhưng
      cây view còn kẹt ở chiều cao ngắn (flex: 0 nên không giãn lại), để lộ
      `android:windowBackground` xám ở đáy màn hình.
      Để trống `behavior` thì KeyboardAvoidingView chỉ còn là một View bọc ngoài.
    */
    <KeyboardAvoidingView
      style={styles.kvRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              onContentSizeChange={(_, height) =>
                setScrollContentHeight(height)
              }
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
                  color={isUsernameFocused ? RED : c.placeholder}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={usernameRef}
                  style={[
                    styles.textInput,
                    isCompactHeight && styles.textInputCompact,
                  ]}
                  placeholder="Tài khoản"
                  placeholderTextColor={c.placeholder}
                  value={userName}
                  onChangeText={setUserName}
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  // Khai báo rõ cho AutoFill của iOS/Android thay vì để hệ điều
                  // hành tự đoán theo heuristic — đoán thì hành vi focus và
                  // keyboard sau khi chọn gợi ý không ổn định.
                  textContentType="username"
                  autoComplete="username"
                  importantForAutofill="yes"
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
                  color={isPasswordFocused ? RED : c.placeholder}
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
                  placeholderTextColor={c.placeholder}
                  value={userPassword}
                  onChangeText={setUserPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
                  importantForAutofill="yes"
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
                    color={c.placeholder}
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
                    // Nút chỉ có icon: không có nhãn thì trình đọc màn hình chỉ
                    // đọc được "nút".
                    accessibilityRole="button"
                    accessibilityLabel="Đăng nhập bằng Face ID"
                  >
                    <Image
                      source={require("../../assets/images/faceid-icon2.png")}
                      style={styles.faceIDIcon}
                    />
                  </TouchableOpacity>
                )}

                {/* Android: cùng ô với nút Face ID, chỉ hiện khi máy có sinh
                    trắc hoặc khoá màn hình. */}
                {Platform.OS === "android" &&
                  (biometricKind || isDeviceLockOnDevice) && (
                    <TouchableOpacity
                      style={[
                        styles.faceIdBtn,
                        { borderColor: hairlineBorderColor },
                        (!isTokenReady || !isFaceIdEnabled) &&
                          styles.faceIdBtnDimmed,
                      ]}
                      onPress={handleFaceIDPress}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Đăng nhập bằng ${biometricLabel}`}
                    >
                      <MaterialCommunityIcons
                        name={androidUnlockIcon}
                        size={28}
                        color={C.blue}
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
                    style={[
                      styles.supportAction,
                      { borderColor: accentBorders.red },
                    ]}
                    onPress={handleOpenSupportEmail}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="mail-outline" size={15} color="#B91C1C" />
                    <Text style={styles.supportActionText} numberOfLines={2}>
                      {SUPPORT_EMAIL}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.supportAction,
                      { borderColor: accentBorders.red },
                    ]}
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
                    color={c.placeholder}
                  />
                  <Text style={styles.secureText}>Kết nối bảo mật SSL</Text>
                </View>
                {!isNarrowFooter && <View style={styles.footerDot} />}
                <View
                  style={[
                    styles.versionPill,
                    { borderColor: hairlineBorderColor },
                  ]}
                >
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
