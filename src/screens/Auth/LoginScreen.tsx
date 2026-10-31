import { C, useAppColors, useStyles } from "../../utils/helpers/colors";
import { getTextScaleFactor } from "../../utils/helpers/textScaling";
import { getNameInitials } from "../../utils/helpers/string";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
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
  readStoredLoginProfile,
  StoredLoginProfile,
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
const SECURE_GREEN = "#16A34A";
const COMPANY_FOUNDED_YEAR = 1983;
const LOGIN_GRADIENT = [C.redLight, C.red, C.redDeep];
const LOGIN_GRADIENT_LOCATIONS = [0, 0.45, 1];
// Ảnh nền ghép sẵn (login-bg-company5.jpg, 2000×1590, từ ảnh phối cảnh
// cholimex-company5): toà nhà ở trên, mặt nước phản chiếu dài bằng phần trên.
// Mép nước cắt ngay trên đầu người đi bộ trước toà nhà, nằm ở 317.83/636 chiều
// cao ảnh.
const PHOTO_ASPECT = 2000 / 1590;
const PHOTO_SHORE = 317.83 / 636;
// Hiện TOÀN CẢNH: ảnh rộng 1.15 lần màn (thấy trọn toà nhà), không phóng theo
// chiều cao — phóng kiểu phủ kín thì biển Cholimex trên toà nhà đè vào thanh
// logo. Ảnh thấp hơn vùng trên thẻ form nên phía trên tô màu trời ở mép ảnh,
// mép ảnh nhoà dần vào màu đó.
const PHOTO_WIDTH_RATIO = 1.15;
const PHOTO_SKY_COLOR = "#CCE0F4";
const PHOTO_SKY_BLEND = 40;
// Mép nước đặt ở 70% vùng ảnh phía trên thẻ form, để luôn còn một dải nước
// ngay trên thẻ như ảnh mẫu VCB.
const SHORE_IN_PHOTO_AREA = 0.7;
// Thẻ form cao tối thiểu chừng này phần màn hình; nội dung cần nhiều hơn thì
// thẻ theo nội dung (iPhone 6.3" cần ~49%). Phần dư dồn lên trên chân trang.
// Mở bàn phím thì thẻ thu về vừa nội dung.
const CARD_MIN_HEIGHT_RATIO = 0.45;
// Thẻ form nâng mép trên thêm chừng này (user muốn nền thông tin lên cao hơn)
// mà ảnh không xê dịch: mép nước vẫn tính như lúc thẻ chưa nâng. Nửa thành
// khoảng thoáng trên lời chào, nửa dồn lên trên chân thẻ. Màn thấp nâng ít hơn
// để khỏi phải cuộn.
const CARD_LIFT = 40;
const CARD_LIFT_SHORT = 20;
const CARD_PADDING_TOP = 24;
const CARD_PADDING_TOP_SHORT = 18;

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default function LoginScreen() {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
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
  // Máy nhớ người đăng nhập trước (họ tên + ảnh) thì chào bằng tên và ẩn ô
  // Tài khoản như VCB. Muốn đổi tài khoản thì tự đăng xuất — `logout` xoá họ
  // tên đã lưu nên lần sau màn này hiện lại ô Tài khoản.
  const [rememberedProfile, setRememberedProfile] =
    useState<StoredLoginProfile | null>(null);
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const isRememberedAccount =
    !!rememberedProfile && userName === rememberedProfile.userName;
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
  const [photoAreaHeight, setPhotoAreaHeight] = useState(0);
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
  const localNetworkLabel = getLocalNetworkPermissionLabel(localNetworkStatus);
  const localNetworkDotStyle = isLocalNetworkGranted
    ? styles.networkDotGranted
    : isLocalNetworkDenied
    ? styles.networkDotDenied
    : styles.networkDotUnknown;
  // Chữ to lên thì nội dung cao thêm mà `windowHeight` không đổi, nên màn hình
  // vẫn rơi vào nhánh "rộng rãi" trong khi thực tế đã chật. Quy về chiều cao
  // hiệu dụng: chia cho hệ số Cỡ chữ của app trước khi so ngưỡng (cỡ chữ của
  // điện thoại thì app bỏ qua).
  const textScale = getTextScaleFactor();
  const effectiveHeight = windowHeight / textScale;
  const isShortHeight = effectiveHeight < 760;
  // Vùng ảnh giãn lấp chỗ trống phía trên thẻ form; tối thiểu đủ thanh logo +
  // một khúc ảnh.
  const photoAreaMinHeight = insets.top + (isShortHeight ? 150 : 176);
  const cardLift = isShortHeight ? CARD_LIFT_SHORT : CARD_LIFT;
  const cardPaddingTop =
    (isShortHeight ? CARD_PADDING_TOP_SHORT : CARD_PADDING_TOP) + cardLift / 2;
  // Mép nước của ảnh rơi đúng `shoreY` — tính như khi thẻ chưa nâng
  // (`cardLift`) nên ảnh đứng yên; phần nước dưới mép đủ dài để nằm dưới cả
  // góc bo của thẻ.
  const shoreY =
    ((photoAreaHeight || windowHeight * 0.5) + cardLift) * SHORE_IN_PHOTO_AREA;
  const photoWidth = windowWidth * PHOTO_WIDTH_RATIO;
  const photoHeight = photoWidth / PHOTO_ASPECT;
  const photoTop = shoreY - photoHeight * PHOTO_SHORE;
  const photoLayout = {
    width: photoWidth,
    height: photoHeight,
    top: photoTop,
    left: (windowWidth - photoWidth) / 2,
  };
  const bottomContentPadding = isKeyboardVisible
    ? 16
    : Math.max(insets.bottom, 12) + 8;
  const cardMinHeight = isKeyboardVisible
    ? 0
    : windowHeight * CARD_MIN_HEIGHT_RATIO;
  // Ba ô giới thiệu ở chân thẻ: nhãn nhỏ trên, giá trị đỏ đậm dưới.
  const infoChips = [
    { label: "Thành lập", value: String(COMPANY_FOUNDED_YEAR) },
    { label: "Phát triển", value: `${companyAge} năm` },
    { label: "Danh mục", value: "Gia vị · Thực phẩm", wide: true },
  ];
  const isContentOverflowing =
    scrollViewportHeight > 0 && scrollContentHeight > scrollViewportHeight + 1;

  useEffect(() => {
    log("LoginScreen mounted, token:", token);
    return () => {
      log("LoginScreen unmounted");
    };
  }, [token]);

  useEffect(() => {
    // Thẻ form nằm nửa dưới màn hình nên bàn phím che mất ô nhập: mở bàn phím
    // thì cuộn hết xuống cho thẻ lên trên bàn phím, đóng thì trả về đầu.
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
  // Có họ tên của đúng tài khoản đó (lưu lúc nạp danh thiếp) thì chào bằng tên.
  useEffect(() => {
    let isCancelled = false;
    Promise.all([readStoredAuthUsername(), readStoredLoginProfile()])
      .then(([storedUserName, profile]) => {
        if (isCancelled || !storedUserName) return;
        setUserName((current) => current || storedUserName);
        if (profile?.userName === storedUserName) setRememberedProfile(profile);
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
      // Hai nền tảng cùng tự hỏi ngay lúc còn splash: qua là vào thẳng, không
      // thấy màn Đăng nhập. Tự hỏi chỉ khi còn phiên để khôi phục — cùng điều kiện
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

    // Hộp hỏi không hiện được khi app chưa ở foreground (vd mở nền do push) —
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
        <View style={styles.root}>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={isKeyboardVisible || isContentOverflowing}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onLayout={(event) =>
              setScrollViewportHeight(event.nativeEvent.layout.height)
            }
            onContentSizeChange={(_, height) => setScrollContentHeight(height)}
          >
            {/* ── ẢNH NỀN (tràn cả vùng tai thỏ, nằm dưới thẻ form) ── */}
            {/* Màu trời phía trên ảnh, phủ xuống quá mép ảnh để không hở. */}
            <View
              style={[
                styles.photoSky,
                {
                  height: Math.max(0, photoTop) + PHOTO_SKY_BLEND,
                  backgroundColor: PHOTO_SKY_COLOR,
                },
              ]}
            />
            <Image
              source={require("../../assets/images/login-bg-company5.jpg")}
              style={[styles.photo, photoLayout]}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[PHOTO_SKY_COLOR, `${PHOTO_SKY_COLOR}00`]}
              style={[
                styles.photoSkyBlend,
                { top: photoTop, height: PHOTO_SKY_BLEND },
              ]}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(0,0,0,0.38)", "rgba(0,0,0,0)"]}
              style={[styles.photoTopShade, { height: insets.top + 120 }]}
            />

            {/* ── THANH TRÊN: logo + nút mạng nội bộ ── */}
            <View
              style={[styles.photoArea, { minHeight: photoAreaMinHeight }]}
              // Chỉ nhận chiều cao lớn nhất: mở bàn phím thì vùng này co lại,
              // giữ nguyên ảnh cho khỏi nhảy.
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setPhotoAreaHeight((current) => Math.max(current, height));
              }}
            >
              <View style={[styles.topBar, { marginTop: insets.top + 10 }]}>
                <View style={styles.brandRow}>
                  <Image
                    source={require("../../assets/images/logo-cholimex-trans.jpg")}
                    style={styles.brandLogo}
                  />
                  <View style={styles.brandTextWrap}>
                    {/* Màn hẹp (375pt) thì co chữ thay vì cắt "…". */}
                    <Text
                      style={styles.brandTitle}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      Cholimex Platform
                    </Text>
                    <Text
                      style={styles.brandTagline}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      Nền tảng quản lý và vận hành
                    </Text>
                  </View>
                </View>

                {(Platform.OS === "ios" || Platform.OS === "android") && (
                  // Chấm màu đã đủ báo trạng thái, không hiện hộp thông báo.
                  // Chỉ iOS bị chặn quyền mới bấm được: mở thẳng Cài đặt như
                  // nút bánh răng ở ô cũ.
                  <TouchableOpacity
                    style={styles.networkBtn}
                    onPress={openLocalNetworkSettings}
                    disabled={!(Platform.OS === "ios" && isLocalNetworkDenied)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Mạng nội bộ: ${localNetworkLabel}`}
                  >
                    <Ionicons name="wifi" size={22} color="#fff" />
                    <View style={[styles.networkDot, localNetworkDotStyle]}>
                      <Ionicons
                        name={
                          isLocalNetworkGranted
                            ? "checkmark"
                            : isLocalNetworkDenied
                            ? "alert"
                            : "help"
                        }
                        size={10}
                        color="#fff"
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── THẺ FORM ── */}
            <View
              style={[
                styles.card,
                isShortHeight && styles.cardShort,
                {
                  paddingTop: cardPaddingTop,
                  paddingBottom: bottomContentPadding,
                  minHeight: cardMinHeight,
                },
              ]}
            >
              <View style={styles.cardInner}>
                {isRememberedAccount && rememberedProfile ? (
                  <View
                    style={[
                      styles.greeting,
                      styles.greetingRow,
                      isShortHeight && styles.greetingShort,
                    ]}
                  >
                    <View style={styles.avatar}>
                      {rememberedProfile.avatar && !isAvatarBroken ? (
                        <Image
                          source={{ uri: rememberedProfile.avatar }}
                          style={styles.avatarImage}
                          onError={() => setIsAvatarBroken(true)}
                        />
                      ) : (
                        <LinearGradient
                          colors={[C.redLight, C.redDeep]}
                          style={styles.avatarInitials}
                        >
                          <Text style={styles.avatarInitialsText}>
                            {getNameInitials(rememberedProfile.name)}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>
                    <View style={styles.greetingTextWrap}>
                      <Text style={styles.greetingHello}>Xin chào,</Text>
                      <Text
                        style={styles.greetingName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {rememberedProfile.name.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.greeting,
                      isShortHeight && styles.greetingShort,
                    ]}
                  >
                    <Text style={styles.greetingHello}>Xin chào,</Text>
                    <Text style={styles.greetingTitle}>
                      Đăng nhập để tiếp tục
                    </Text>
                  </View>
                )}

                {/* Username — ẩn khi đã chào bằng tên */}
                {!isRememberedAccount && (
                  <View
                    style={[
                      styles.inputWrapper,
                      isShortHeight && styles.inputWrapperShort,
                      isUsernameFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={isUsernameFocused ? RED : c.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={usernameRef}
                      style={[
                        styles.textInput,
                        isShortHeight && styles.textInputShort,
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
                )}

                {/* Password */}
                <View
                  style={[
                    styles.inputWrapper,
                    isShortHeight && styles.inputWrapperShort,
                    isPasswordFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isPasswordFocused ? RED : c.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[
                      styles.textInput,
                      isShortHeight && styles.textInputShort,
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
                      name={
                        isPasswordVisible ? "eye-outline" : "eye-off-outline"
                      }
                      size={21}
                      color={RED}
                    />
                  </TouchableOpacity>
                </View>

                {/* Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.loginBtn,
                      isShortHeight && styles.loginBtnShort,
                      isLoginDisabled && styles.loginBtnDisabled,
                    ]}
                    disabled={isLoginDisabled || isLoading}
                    onPress={handlePressLogin}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={LOGIN_GRADIENT}
                      locations={LOGIN_GRADIENT_LOCATIONS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginBtnFill}
                    />
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
                        isShortHeight && styles.faceIdBtnShort,
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
                          isShortHeight && styles.faceIdBtnShort,
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

                {/* Hỗ trợ */}
                <View
                  style={[
                    styles.supportRow,
                    isShortHeight && styles.supportRowShort,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.supportAction}
                    onPress={handleOpenSupportEmail}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Email hỗ trợ ${SUPPORT_EMAIL}`}
                  >
                    <Ionicons name="mail-outline" size={17} color={RED} />
                    <Text style={styles.supportActionText} numberOfLines={1}>
                      Email hỗ trợ
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.supportAction}
                    onPress={handleOpenSupportPhone}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Gọi hỗ trợ ${SUPPORT_PHONE}`}
                  >
                    <Ionicons name="call-outline" size={17} color={RED} />
                    <Text style={styles.supportActionText} numberOfLines={1}>
                      {SUPPORT_PHONE}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Chỗ trống của thẻ cao tối thiểu dồn vào đây: chân trang luôn
                    nằm sát đáy, các ô nhập không giãn ra. */}
                <View style={[styles.cardSpacer, { minHeight: cardLift / 2 }]} />

                {/* Footer */}
                <View
                  style={[styles.footer, isShortHeight && styles.footerShort]}
                >
                  <View style={styles.infoRow}>
                    {infoChips.map((chip) => (
                      <View
                        key={chip.label}
                        style={[
                          styles.infoChip,
                          chip.wide && styles.infoChipWide,
                        ]}
                      >
                        <Text style={styles.infoLabel} numberOfLines={1}>
                          {chip.label}
                        </Text>
                        <Text
                          style={styles.infoValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {chip.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.secureRow}>
                    <Ionicons
                      name="shield-checkmark"
                      size={15}
                      color={SECURE_GREEN}
                    />
                    <Text style={styles.secureText}>Kết nối bảo mật SSL</Text>
                    <View style={styles.versionPill}>
                      <Text style={styles.versionText} numberOfLines={1}>
                        {appVersionLabel} · Cholimex Food
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
