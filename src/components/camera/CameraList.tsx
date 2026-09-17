import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  BackHandler,
  Animated,
  InteractionManager,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableWithoutFeedback } from "react-native";
import Video from "react-native-video";
import WebView from "react-native-webview";
import Orientation from "react-native-orientation-locker";
import {
  C,
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../utils/helpers/colors";
import { makeStyles } from "./CameraList.styles";
import { useImmersiveMode } from "../../hooks/useImmersiveMode";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import CameraSnapshotThumbnail from "./shared/CameraSnapshotThumbnail";
import { buildCameraFullscreenHTML } from "./shared/cameraStreamHtml";
import {
  ANDROID_LIVE_RETRY_BASE_MS,
  ANDROID_LIVE_RETRY_MAX_MS,
  ANDROID_LIVE_STALE_AFTER_MS,
  ANDROID_LIVE_WATCHDOG_INTERVAL_MS,
  GO2RTC_HOST,
} from "./shared/cameraStreamConfig";
import {
  postCameraWebViewToken,
  startCameraWebView,
  stopCameraWebView,
} from "./shared/cameraWebViewMessaging";
import {
  getCameraHlsUrl,
  getCameraFullscreenSnapshotUrl,
  getVisiblePageIndexes,
} from "./shared/cameraStreamUtils";
import { useCameraViewToken } from "./shared/useCameraViewToken";
import EmptyState from "../ui/EmptyState";
import { createTabBarStyle } from "../../navigation/shared/tabBarTheme";

const LANDSCAPE_BACK_FALLBACK_DELAY_MS = 120;

/** Quá hạn này mà máy vẫn chưa xoay ngang thì cứ mở fullscreen ở chiều dọc. */
const OPEN_FULLSCREEN_FALLBACK_DELAY_MS = 700;

/**
 * Cơ chế dựng fullscreen, tách theo platform.
 *
 * Android (true): lớp phủ nằm chung cây React với danh sách. Bắt buộc, vì mỗi
 * <Modal> là một Dialog có window riêng mà lệnh ẩn thanh hệ thống chỉ áp được
 * lên window của Activity — để nguyên Modal thì Android vẫn chừa dải status
 * bar và navigation bar/taskbar quanh video.
 *
 * iOS (false): giữ nguyên <Modal> như bản 2.36. iOS không có thanh điều hướng
 * cần ẩn, nên lớp phủ chỉ tổ làm việc xoay ngang kém mượt: nó bắt RN re-layout
 * cả FlatList phía dưới cùng lúc với video, lại kéo theo header/tabBar phải
 * ẩn/hiện qua navigation.setOptions ở mỗi lần mở đóng. Modal tránh được cả hai
 * vì nó tự phủ lên trên và nằm ở window riêng.
 */
const USE_FULLSCREEN_OVERLAY = Platform.OS === "android";

const CameraList: React.FC = () => {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const separatorColor = useSeparatorColor();
  const route = useRoute<any>();
  const { cameras, zoneName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [screenWidth, setScreenWidth] = React.useState(
    Dimensions.get("window").width,
  );
  const [layoutCount, setLayoutCount] = React.useState<number>(16);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [fullscreenCamera, setFullscreenCamera] = React.useState<any | null>(
    null,
  );
  const [page, setPage] = React.useState(0);
  const [isFullMuted, setIsFullMuted] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const [isClosingFullscreen, setIsClosingFullscreen] = React.useState(false);
  /**
   * Đã phủ đen toàn màn hình nhưng máy chưa xoay ngang xong.
   *
   * Chỉ nhánh lớp phủ (Android) dùng. Trước đây lớp phủ chỉ mount sau khi
   * Dimensions xác nhận đã ngang, nên suốt lúc xoay người dùng nhìn thẳng vào
   * danh sách đang xoay rồi fullscreen mới bụp ra. Các app camera phủ đen ngay
   * lúc chạm rồi mới xoay, nên chỉ thấy nền đen quay — đây là cờ để làm vậy.
   */
  const [isFullscreenPending, setIsFullscreenPending] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [focusKey, setFocusKey] = React.useState(0);
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null,
  );
  const translateX = React.useRef(new Animated.Value(0)).current;
  const fsTranslateX = React.useRef(new Animated.Value(0)).current;

  const fullscreenWebViewRef = React.useRef<any>(null);
  const pendingFullscreenCameraRef = React.useRef<any | null>(null);
  const isFirstFocusRef = React.useRef(true);
  const isFocusedRef = React.useRef(false);
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);
  const isClosingFullscreenRef = React.useRef(false);
  const pendingBackToPortraitRef = React.useRef(false);
  const pendingBackTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingBackActionRef = React.useRef<any>(null);
  const closeFullscreenTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const openFullscreenTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Android stall detection
  const lastProgressRef = React.useRef<number>(Date.now());
  const androidWatchdogRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const androidRetryRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const androidErrorCountRef = React.useRef(0);
  const [androidVideoKey, setAndroidVideoKey] = React.useState(0);

  const {
    cameraToken,
    cameraTokenRef,
    clearTokenRefreshTimer,
    fetchCameraTokenRef,
    setCameraToken,
    setThumbTimestamp,
    thumbTimestamp,
    tokenErrorMessage,
  } = useCameraViewToken({
    isFocused,
    onActive: () => {
      setFocusKey((k) => k + 1);
      startCameraWebView(fullscreenWebViewRef.current);
    },
    onBackground: () => {
      stopCameraWebView(fullscreenWebViewRef.current);
    },
    onTokenReceived: (newToken) => {
      postCameraWebViewToken(fullscreenWebViewRef.current, newToken);
    },
  });

  const clearAndroidTimers = React.useCallback(() => {
    if (androidRetryRef.current) clearTimeout(androidRetryRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    androidRetryRef.current = null;
    androidWatchdogRef.current = null;
  }, []);

  const isWindowLandscape = React.useCallback(() => {
    const { width, height } = Dimensions.get("window");
    return width > height;
  }, []);

  const clearCloseFullscreenTimeout = React.useCallback(() => {
    if (closeFullscreenTimeoutRef.current) {
      clearTimeout(closeFullscreenTimeoutRef.current);
      closeFullscreenTimeoutRef.current = null;
    }
  }, []);

  const clearOpenFullscreenTimeout = React.useCallback(() => {
    if (openFullscreenTimeoutRef.current) {
      clearTimeout(openFullscreenTimeoutRef.current);
      openFullscreenTimeoutRef.current = null;
    }
  }, []);

  const clearPendingBackTimeout = React.useCallback(() => {
    if (pendingBackTimeoutRef.current) {
      clearTimeout(pendingBackTimeoutRef.current);
      pendingBackTimeoutRef.current = null;
    }
  }, []);

  const finishPendingBack = React.useCallback(() => {
    if (!pendingBackToPortraitRef.current || !pendingBackActionRef.current) {
      return;
    }

    const action = pendingBackActionRef.current;
    pendingBackActionRef.current = null;
    pendingBackToPortraitRef.current = false;
    clearPendingBackTimeout();
    navigation.dispatch(action);
  }, [clearPendingBackTimeout, navigation]);

  const hideFullscreenAfterPortrait = React.useCallback(() => {
    if (!isClosingFullscreenRef.current) return;

    clearCloseFullscreenTimeout();

    if (!isWindowLandscape()) {
      setFullscreenCamera(null);
      setIsClosingFullscreen(false);
      setIsFullscreenPending(false);
      isClosingFullscreenRef.current = false;
      return;
    }

    closeFullscreenTimeoutRef.current = setTimeout(() => {
      closeFullscreenTimeoutRef.current = null;
      setFullscreenCamera(null);
      setIsClosingFullscreen(false);
      setIsFullscreenPending(false);
      isClosingFullscreenRef.current = false;
    }, 500);
  }, [clearCloseFullscreenTimeout, isWindowLandscape]);

  const presentPendingFullscreen = React.useCallback(() => {
    const pendingCamera = pendingFullscreenCameraRef.current;
    if (!pendingCamera) return;

    clearOpenFullscreenTimeout();
    setIsFullscreenPending(false);
    pendingFullscreenCameraRef.current = null;
    setFullscreenCamera(pendingCamera);
  }, [clearOpenFullscreenTimeout]);

  React.useEffect(() => {
    isClosingFullscreenRef.current = isClosingFullscreen;
  }, [isClosingFullscreen]);

  React.useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // Orientation listener
  React.useEffect(() => {
    const handler = (orientation: string) => {
      const nextIsLandscape =
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT";
      setIsLandscape(nextIsLandscape);

      if (nextIsLandscape) {
        // iOS Simulator ở lần xoay đầu có thể phát sự kiện LANDSCAPE trước
        // khi UIKit cập nhật kích thước window. Chỉ mount Modal khi kích thước
        // thực tế cũng đã ngang; Dimensions listener bên dưới sẽ gọi lại.
        if (isWindowLandscape()) {
          presentPendingFullscreen();
        }
      } else {
        hideFullscreenAfterPortrait();
        finishPendingBack();
      }
    };
    Orientation.addOrientationListener(handler);
    return () => Orientation.removeOrientationListener(handler);
  }, [
    finishPendingBack,
    hideFullscreenAfterPortrait,
    isWindowLandscape,
    presentPendingFullscreen,
  ]);

  useFocusEffect(
    React.useCallback(() => {
      translateX.stopAnimation(() => {
        translateX.setValue(0);
      });
      setFocusKey((k) => k + 1);
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        setCameraToken("");
        cameraTokenRef.current = "";
        setThumbTimestamp(0);
      }
      fetchCameraTokenRef.current?.(true);

      const interactionTask = InteractionManager.runAfterInteractions(() => {
        if (isFocusedRef.current) {
          translateX.setValue(0);
          setFocusKey((k) => k + 1);
        }
      });

      return () => {
        interactionTask.cancel();
        clearTokenRefreshTimer();
      };
    }, [
      cameraTokenRef,
      clearTokenRefreshTimer,
      fetchCameraTokenRef,
      setCameraToken,
      setThumbTimestamp,
      translateX,
    ]),
  );

  React.useEffect(() => {
    if (!isFocused) return;
    setFocusKey((k) => k + 1);
  }, [isFocused]);

  React.useEffect(() => {
    if (videoReady) setPendingThumbUrl(null);
  }, [videoReady]);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  React.useEffect(() => {
    return () => {
      clearCloseFullscreenTimeout();
      clearPendingBackTimeout();
      clearOpenFullscreenTimeout();
      pendingFullscreenCameraRef.current = null;
      Orientation.lockToPortrait();
      clearAndroidTimers();
    };
  }, [
    clearAndroidTimers,
    clearCloseFullscreenTimeout,
    clearOpenFullscreenTimeout,
    clearPendingBackTimeout,
  ]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (pendingBackToPortraitRef.current) return;

      if (fullscreenCamera) {
        event.preventDefault();
        clearAndroidTimers();
        fsTranslateX.setValue(0);
        setPendingThumbUrl(null);
        isClosingFullscreenRef.current = true;
        setIsClosingFullscreen(true);
        hideFullscreenAfterPortrait();
        return;
      }

      if (isLandscape || isWindowLandscape()) {
        event.preventDefault();
        pendingBackToPortraitRef.current = true;
        pendingBackActionRef.current = event.data.action;
        clearPendingBackTimeout();
        pendingBackTimeoutRef.current = setTimeout(() => {
          finishPendingBack();
        }, LANDSCAPE_BACK_FALLBACK_DELAY_MS);
      }
    });

    return unsubscribe;
  }, [
    clearAndroidTimers,
    clearPendingBackTimeout,
    finishPendingBack,
    fsTranslateX,
    fullscreenCamera,
    hideFullscreenAfterPortrait,
    isLandscape,
    isWindowLandscape,
    navigation,
  ]);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
      if (window.width > window.height) {
        presentPendingFullscreen();
      } else {
        hideFullscreenAfterPortrait();
        finishPendingBack();
      }
    });
    return () => sub.remove();
  }, [
    finishPendingBack,
    hideFullscreenAfterPortrait,
    presentPendingFullscreen,
  ]);

  const closeFullscreen = React.useCallback(() => {
    pendingFullscreenCameraRef.current = null;
    clearOpenFullscreenTimeout();
    setIsFullscreenPending(false);
    Orientation.lockToPortrait();
    clearAndroidTimers();
    fsTranslateX.setValue(0);
    setPendingThumbUrl(null);
    setIsLandscape(false);
    isClosingFullscreenRef.current = true;
    setIsClosingFullscreen(true);
    hideFullscreenAfterPortrait();
  }, [
    clearAndroidTimers,
    clearOpenFullscreenTimeout,
    fsTranslateX,
    hideFullscreenAfterPortrait,
  ]);

  const toggleOrientation = React.useCallback(() => {
    if (isLandscape) {
      setIsLandscape(false);
      Orientation.lockToPortrait();
    } else {
      setIsLandscape(true);
      Orientation.lockToLandscapeLeft();
    }
  }, [isLandscape]);

  const handleAndroidReady = React.useCallback(() => {
    if (androidRetryRef.current) {
      clearTimeout(androidRetryRef.current);
      androidRetryRef.current = null;
    }
    lastProgressRef.current = Date.now();
    androidErrorCountRef.current = 0;
    setVideoReady(true);
  }, []);

  const handleAndroidLoad = React.useCallback(() => {
    lastProgressRef.current = Date.now();
    // onLoad mới chỉ xác nhận manifest HLS đã tải. Chưa mở Video tại đây vì
    // decoder Android có thể đang chờ keyframe và tạm render frame xám/rác.
    if (androidRetryRef.current) {
      clearTimeout(androidRetryRef.current);
      androidRetryRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (
      Platform.OS !== "android" ||
      !isFocused ||
      !fullscreenCamera ||
      !cameraToken ||
      isClosingFullscreen
    )
      return;

    lastProgressRef.current = Date.now();
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    androidWatchdogRef.current = setInterval(() => {
      if (Date.now() - lastProgressRef.current < ANDROID_LIVE_STALE_AFTER_MS)
        return;

      lastProgressRef.current = Date.now();
      setVideoReady(false);
      setAndroidVideoKey((k) => k + 1);
    }, ANDROID_LIVE_WATCHDOG_INTERVAL_MS);

    return () => {
      if (androidWatchdogRef.current) {
        clearInterval(androidWatchdogRef.current);
        androidWatchdogRef.current = null;
      }
    };
  }, [
    androidVideoKey,
    cameraToken,
    fullscreenCamera,
    isClosingFullscreen,
    isFocused,
  ]);

  const openFullscreen = React.useCallback(
    (item: any) => {
      clearCloseFullscreenTimeout();
      clearAndroidTimers();
      isClosingFullscreenRef.current = false;
      setIsClosingFullscreen(false);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("#000", false);
        StatusBar.setBarStyle("light-content");
      }
      pendingFullscreenCameraRef.current = item;
      // Chỉ ép ngang khi thật sự mở fullscreen. Không đặt lệnh này trong
      // beforeRemove vì sẽ làm màn hình nhảy ngang khi người dùng back.
      Orientation.lockToLandscape();
      setIsLandscape(true);
      setPendingThumbUrl(
        getCameraFullscreenSnapshotUrl(item.iD_Camera_Ma, thumbTimestamp),
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
      androidErrorCountRef.current = 0;
      lastProgressRef.current = Date.now();
      if (isWindowLandscape()) {
        presentPendingFullscreen();
        return;
      }

      if (!USE_FULLSCREEN_OVERLAY) {
        // iOS: chờ Dimensions/orientation listener xác nhận đã ngang rồi mới
        // mount Modal. Nhờ vậy frame đầu không còn hiện fullscreen dọc.
        return;
      }

      // Android: phủ đen ngay rồi mới xoay, đừng để người dùng nhìn danh sách
      // xoay theo. Video vẫn chờ xoay xong mới mount (xem `fullscreenCamera`),
      // nên nhịp xoay không phải gánh thêm việc dựng player.
      setIsFullscreenPending(true);
      clearOpenFullscreenTimeout();
      openFullscreenTimeoutRef.current = setTimeout(() => {
        openFullscreenTimeoutRef.current = null;
        // Lưới an toàn: máy không xoay được (người dùng khoá xoay, hoặc hệ
        // thống bỏ qua lệnh) thì vẫn phải mở fullscreen chứ không kẹt màn đen.
        presentPendingFullscreen();
      }, OPEN_FULLSCREEN_FALLBACK_DELAY_MS);
    },
    [
      clearAndroidTimers,
      clearCloseFullscreenTimeout,
      clearOpenFullscreenTimeout,
      isWindowLandscape,
      presentPendingFullscreen,
      thumbTimestamp,
    ],
  );

  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    if (fullscreenCamera || isClosingFullscreen) {
      StatusBar.setBackgroundColor("#000", false);
      return;
    }
    StatusBar.setBackgroundColor(C.red, false);
  }, [fullscreenCamera, isClosingFullscreen]);

  // Giữ cả lúc đang chờ xoay ngang lẫn lúc đang đóng, để nền đen phủ suốt hai
  // đầu: người dùng không thấy danh sách xoay theo ở cả lượt mở và lượt đóng.
  const isFullscreenActive =
    fullscreenCamera !== null || isClosingFullscreen || isFullscreenPending;

  // Ẩn status bar và navigation bar/taskbar trong lúc xem toàn màn hình.
  // Chỉ nhánh lớp phủ cần: iOS đã có Modal phủ kín.
  useImmersiveMode(USE_FULLSCREEN_OVERLAY && isFullscreenActive);

  /**
   * Khôi phục danh sách ngay khi đóng lớp phủ fullscreen.
   *
   * Lớp phủ nằm cùng cây React nên đóng nó không làm màn hình blur, tức
   * `useFocusEffect` không chạy lại. Nếu trước đó người dùng đã vuốt chuyển
   * trang, `translateX` có thể còn treo ở ±screenWidth (cử chỉ bị huỷ giữa
   * chừng thì `onEnd` không bắn) và `listArea` lại `overflow: hidden`, nên cả
   * trang bị đẩy ra ngoài khung -> nhìn như danh sách trống. Trước đây phải
   * rời màn rồi focus lại mới thấy.
   *
   * Chỉ kéo `translateX` về 0 chứ không bump `focusKey` như nhánh focus:
   * danh sách vẫn mount nguyên vẹn dưới lớp phủ, mà `focusKey` nằm trong URL
   * snapshot nên bump sẽ tải lại toàn bộ thumbnail một cách vô ích.
   */
  const wasFullscreenActiveRef = React.useRef(false);
  React.useEffect(() => {
    const wasActive = wasFullscreenActiveRef.current;
    wasFullscreenActiveRef.current = isFullscreenActive;
    if (!wasActive || isFullscreenActive) return;

    translateX.stopAnimation(() => {
      translateX.setValue(0);
    });
  }, [isFullscreenActive, translateX]);

  // Lớp phủ nằm chung cây nên phải tự giấu header/tabBar thì nó mới phủ kín
  // như Modal. Nhánh iOS không đụng tới, Modal tự lo.
  React.useEffect(() => {
    if (!USE_FULLSCREEN_OVERLAY) return;
    navigation.setOptions({ headerShown: !isFullscreenActive });
    return () => navigation.setOptions({ headerShown: true });
  }, [isFullscreenActive, navigation]);

  React.useEffect(() => {
    if (!USE_FULLSCREEN_OVERLAY) return;
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.setOptions({
      tabBarStyle: isFullscreenActive
        ? { display: "none" }
        : [createTabBarStyle({ bottomInset: insets.bottom })],
    });

    return () => {
      tabNavigation.setOptions({
        tabBarStyle: [createTabBarStyle({ bottomInset: insets.bottom })],
      });
    };
  }, [insets.bottom, isFullscreenActive, navigation]);

  /**
   * Nút back cứng khi đang fullscreen: đóng lớp phủ chứ không pop màn.
   *
   * Ở nhánh iOS `<Modal onRequestClose>` lo việc này; lớp phủ thường không nhận
   * được back nên phải tự đăng ký, nếu không back sẽ rời thẳng danh sách trong
   * lúc máy còn đang xoay ngang.
   */
  React.useEffect(() => {
    if (!USE_FULLSCREEN_OVERLAY || !isFullscreenActive) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closeFullscreen();
        return true;
      },
    );

    return () => subscription.remove();
  }, [closeFullscreen, isFullscreenActive]);

  /**
   * Khoảng chừa dưới hàng dot phân trang.
   *
   * Chỉ Android mới cần: thanh điều hướng của nó đặc và che hẳn hàng dot. Home
   * indicator của iOS chỉ là vạch mỏng nằm đè lên, chừa theo insets.bottom
   * (34px) sẽ thừa ra một dải trắng và đẩy dot lên cao.
   */
  const paginationBottomInset = Platform.OS === "android" ? insets.bottom : 0;

  /**
   * Bề rộng dùng để dựng danh sách, tách khỏi `screenWidth`.
   *
   * Ở nhánh lớp phủ (Android) danh sách vẫn mount bên dưới fullscreen và bị
   * che kín. Nếu để nó bám theo `screenWidth` thì mỗi lần xoay, `itemWidth`
   * đổi -> `renderItem` đổi -> cả trang card kèm ảnh snapshot re-render, ngay
   * giữa lúc máy đang chạy animation xoay. Đóng băng lại thì lúc xoay JS
   * thread rảnh cho video, mà vẫn không phải unmount gì (không reload ảnh).
   *
   * Lưu ý không dùng giá trị này cho fullscreen: fullscreen cần bề rộng thật
   * theo chiều ngang để tính ngưỡng vuốt và quãng trượt.
   */
  const [listWidth, setListWidth] = React.useState(
    () => Dimensions.get("window").width,
  );
  React.useEffect(() => {
    if (USE_FULLSCREEN_OVERLAY && isFullscreenActive) return;
    setListWidth(screenWidth);
  }, [isFullscreenActive, screenWidth]);

  const numColumns = layoutCount === 1 ? 1 : 2;
  const itemWidth = listWidth / numColumns - 16;
  const totalPages = Math.ceil(cameras.length / layoutCount);
  const isScreenLandscape = screenWidth > Dimensions.get("window").height;
  const pagedCameras = cameras.slice(
    page * layoutCount,
    (page + 1) * layoutCount,
  );
  const fullscreenIndex = fullscreenCamera
    ? cameras.findIndex(
        (cam: any) => cam.iD_Camera === fullscreenCamera.iD_Camera,
      )
    : -1;

  React.useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  React.useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  const changePage = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetLayout = (count: number) => {
    setLayoutCount(count);
    setPage(0);
    setShowLayoutModal(false);
  };

  const handleNavigate = () => {
    Orientation.lockToPortrait();
    setIsLandscape(false);
    navigation.navigate("CameraListGrid", { cameras, zoneName });
  };

  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<any>) => {
      return (
        <View
          style={[
            styles.card,
            { width: itemWidth, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <MaterialIcons name="videocam" size={16} color={colors.text} />
              <Text
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.iD_Camera_MoTa}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openFullscreen(item)}
            style={styles.videoWrapper}
          >
            {cameraToken && thumbTimestamp ? (
              <CameraSnapshotThumbnail
                cameraId={item.iD_Camera}
                cameraCode={item.iD_Camera_Ma}
                cameraToken={cameraToken}
                thumbTimestamp={thumbTimestamp}
                focusKey={focusKey}
              />
            ) : (
              <View style={[styles.preview, styles.previewLoadingBackground]}>
                <ActivityIndicator size="small" color={C.red} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [
      cameraToken,
      colors.surface,
      colors.text,
      focusKey,
      itemWidth,
      openFullscreen,
      styles,
      thumbTimestamp,
    ],
  );

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCamera
      ? getCameraFullscreenSnapshotUrl(
          fullscreenCamera.iD_Camera_Ma,
          thumbTimestamp,
        )
      : null);
  const visiblePageIndexes = React.useMemo(
    () => getVisiblePageIndexes(page, totalPages),
    [page, totalPages],
  );

  const swipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-15, 15])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          const curPage = pageRef.current;
          const total = totalPagesRef.current;
          if (
            (curPage === 0 && e.translationX > 0) ||
            (curPage === total - 1 && e.translationX < 0)
          ) {
            translateX.setValue(e.translationX * 0.2);
          } else {
            translateX.setValue(e.translationX);
          }
        })
        .onEnd((e) => {
          const curPage = pageRef.current;
          const total = totalPagesRef.current;
          const threshold = listWidth * 0.3;
          if (e.translationX < -threshold && curPage < total - 1) {
            Animated.timing(translateX, {
              toValue: -listWidth,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              changePage(curPage + 1);
            });
          } else if (e.translationX > threshold && curPage > 0) {
            Animated.timing(translateX, {
              toValue: listWidth,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              changePage(curPage - 1);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }).start();
          }
        })
        // Cử chỉ bị huỷ (đổi hướng màn hình, mở fullscreen, handler khác
        // giành quyền...) thì onEnd không chạy; không kéo về 0 ở đây thì
        // danh sách kẹt ngoài khung nhìn.
        .onFinalize((_e, success) => {
          if (success) return;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }),
    [changePage, listWidth, translateX],
  );

  const switchFullscreenCamera = React.useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      const nextCam = cameras[nextIndex];
      if (!nextCam) return;

      stopCameraWebView(fullscreenWebViewRef.current);
      clearAndroidTimers();

      setPendingThumbUrl(
        getCameraFullscreenSnapshotUrl(nextCam.iD_Camera_Ma, thumbTimestamp),
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
      androidErrorCountRef.current = 0;
      lastProgressRef.current = Date.now();
      setFullscreenCamera(nextCam);

      const nextPage = Math.floor(nextIndex / layoutCount);
      if (nextPage !== pageRef.current) {
        setPage(nextPage);
      }

      fsTranslateX.setValue(direction === "next" ? screenWidth : -screenWidth);
      Animated.timing(fsTranslateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    },
    [
      cameras,
      clearAndroidTimers,
      fsTranslateX,
      layoutCount,
      screenWidth,
      thumbTimestamp,
    ],
  );

  const handleFullscreenSwipe = React.useCallback(
    (direction: "next" | "prev", animateOut = true) => {
      if (fullscreenIndex < 0) return;
      const nextIndex =
        direction === "next" ? fullscreenIndex + 1 : fullscreenIndex - 1;
      if (nextIndex < 0 || nextIndex >= cameras.length) {
        Animated.spring(fsTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
        return;
      }

      const switchNow = () => switchFullscreenCamera(nextIndex, direction);

      if (!animateOut) {
        switchNow();
        return;
      }

      Animated.timing(fsTranslateX, {
        toValue: direction === "next" ? -screenWidth : screenWidth,
        duration: 220,
        useNativeDriver: true,
      }).start(switchNow);
    },
    [
      cameras.length,
      fsTranslateX,
      fullscreenIndex,
      screenWidth,
      switchFullscreenCamera,
    ],
  );

  const fullscreenSwipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-35, 35])
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
          if (fullscreenIndex < 0) return;
          const isAtFirst = fullscreenIndex === 0;
          const isAtLast = fullscreenIndex === cameras.length - 1;
          const isPullingPastStart = isAtFirst && e.translationX > 0;
          const isPullingPastEnd = isAtLast && e.translationX < 0;
          fsTranslateX.setValue(
            isPullingPastStart || isPullingPastEnd
              ? e.translationX * 0.2
              : e.translationX,
          );
        })
        .onEnd((e) => {
          if (fullscreenIndex < 0) return;
          const threshold = screenWidth * 0.22;
          if (
            e.translationX < -threshold &&
            fullscreenIndex < cameras.length - 1
          ) {
            Animated.timing(fsTranslateX, {
              toValue: -screenWidth,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              handleFullscreenSwipe("next", false);
            });
          } else if (e.translationX > threshold && fullscreenIndex > 0) {
            Animated.timing(fsTranslateX, {
              toValue: screenWidth,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              handleFullscreenSwipe("prev", false);
            });
          } else {
            Animated.spring(fsTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }).start();
          }
        }),
    [
      cameras.length,
      fsTranslateX,
      fullscreenIndex,
      handleFullscreenSwipe,
      screenWidth,
    ],
  );
  const fullscreenDoubleTapGesture = React.useMemo(
    () => Gesture.Tap().runOnJS(true).numberOfTaps(2).onEnd(closeFullscreen),
    [closeFullscreen],
  );
  const fullscreenGesture = React.useMemo(
    () =>
      Gesture.Simultaneous(fullscreenSwipeGesture, fullscreenDoubleTapGesture),
    [fullscreenDoubleTapGesture, fullscreenSwipeGesture],
  );
  const isEmpty = pagedCameras.length === 0;

  if (tokenErrorMessage) {
    return (
      <View style={styles.offlineState}>
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Camera"
          subtitle={tokenErrorMessage}
        />
      </View>
    );
  }

  /**
   * Thân fullscreen, dùng chung cho cả hai vỏ bên dưới. Chỉ vỏ khác nhau theo
   * platform, nội dung và mọi cử chỉ bên trong thì giống hệt.
   */
  const fullscreenBody = isFullscreenActive ? (
    <>
      <View
        style={[
          styles.fsHeader,
          isLandscape
            ? [styles.fsHeaderLandscape, { paddingLeft: insets.left || 16 }]
            : { paddingTop: insets.top || 48 },
        ]}
      >
        <TouchableOpacity
          style={styles.fsHeaderBtn}
          onPress={closeFullscreen}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.fsHeaderSpacer} />
        <TouchableOpacity
          style={styles.fsHeaderBtn}
          onPress={() => setIsFullMuted((v) => !v)}
        >
          <Ionicons
            name={
              isFullMuted ? "volume-mute-outline" : "volume-medium-outline"
            }
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fsHeaderBtn}
          onPress={toggleOrientation}
        >
          <MaterialCommunityIcons
            name={
              isLandscape
                ? "phone-rotate-portrait"
                : "phone-rotate-landscape"
            }
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.fsVideoArea}>
        <GestureDetector gesture={fullscreenGesture}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: fsTranslateX }] },
            ]}
          >
            {isClosingFullscreen ? null : fullscreenCamera &&
              cameraToken ? (
              <>
                {Platform.OS === "android" && (
                  <Video
                    key={`${fullscreenCamera.iD_Camera}-${androidVideoKey}`}
                    source={{
                      uri: getCameraHlsUrl(fullscreenCamera.iD_Camera_Ma),
                      headers: { Authorization: `Bearer ${cameraToken}` },
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      videoReady ? styles.visibleVideo : styles.hiddenVideo,
                    ]}
                    resizeMode="contain"
                    muted={isFullMuted}
                    repeat
                    controls={false}
                    disableFocus
                    useTextureView
                    hideShutterView={true}
                    bufferConfig={{
                      minBufferMs: 1000,
                      maxBufferMs: 3000,
                      bufferForPlaybackMs: 500,
                      bufferForPlaybackAfterRebufferMs: 1000,
                      backBufferDurationMs: 0,
                    }}
                    onLoad={handleAndroidLoad}
                    onReadyForDisplay={handleAndroidReady}
                    onProgress={() =>
                      (lastProgressRef.current = Date.now())
                    }
                    onError={() => {
                      const attempt = (androidErrorCountRef.current += 1);
                      setVideoReady(false);
                      if (androidRetryRef.current)
                        clearTimeout(androidRetryRef.current);
                      androidRetryRef.current = setTimeout(() => {
                        androidRetryRef.current = null;
                        lastProgressRef.current = Date.now();
                        setVideoReady(false);
                        setAndroidVideoKey((k) => k + 1);
                      }, Math.min(ANDROID_LIVE_RETRY_MAX_MS, ANDROID_LIVE_RETRY_BASE_MS * 2 ** (attempt - 1)));
                    }}
                  />
                )}

                {Platform.OS === "ios" && (
                  <WebView
                    key={fullscreenCamera.iD_Camera}
                    ref={fullscreenWebViewRef}
                    source={{
                      html: buildCameraFullscreenHTML(
                        fullscreenCamera.iD_Camera_Ma,
                      ),
                      baseUrl: GO2RTC_HOST,
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      videoReady ? styles.visibleVideo : styles.hiddenVideo,
                    ]}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    cacheEnabled={false}
                    mixedContentMode="always"
                    originWhitelist={["*"]}
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    scrollEnabled={false}
                    scalesPageToFit={false}
                    onLoad={() => {
                      postCameraWebViewToken(
                        fullscreenWebViewRef.current,
                        cameraToken,
                      );
                    }}
                    onMessage={(e) => {
                      const data = e.nativeEvent.data;
                      if (data === "ready") setVideoReady(true);
                      else if (data === "token_expired")
                        fetchCameraTokenRef.current?.(true);
                      else if (data === "close_fullscreen")
                        closeFullscreen();
                      else if (data === "swipe_next")
                        handleFullscreenSwipe("next");
                      else if (data === "swipe_prev")
                        handleFullscreenSwipe("prev");
                    }}
                  />
                )}

                {!videoReady && (
                  <View style={StyleSheet.absoluteFill}>
                    {displayThumbUrl && (
                      <Image
                        source={{
                          uri: displayThumbUrl,
                          headers: {
                            Authorization: `Bearer ${cameraToken}`,
                          },
                        }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="contain"
                      />
                    )}
                    <View style={styles.thumbOverlay} />
                    <ActivityIndicator
                      size="large"
                      color={C.red}
                      style={styles.spinner}
                    />
                  </View>
                )}
                {Platform.OS === "android" && (
                  <GestureDetector gesture={fullscreenGesture}>
                    <View style={styles.fsSwipeOverlay} />
                  </GestureDetector>
                )}
              </>
            ) : fullscreenCamera ? (
              <ActivityIndicator
                size="large"
                color={C.red}
                style={styles.spinner}
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
        {fullscreenIndex >= 0 && cameras.length > 0 && (
          <View
            style={[
              styles.fsPager,
              { bottom: Math.max(insets.bottom, 16) + 20 },
            ]}
          >
            <Text style={styles.fsPagerText}>
              {fullscreenIndex + 1} / {cameras.length}
            </Text>
          </View>
        )}
      </View>
    </>
  ) : null;

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          {zoneName} ({cameras.length} Camera)
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNavigate}>
            <Ionicons name="apps" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLayoutModal(true)}>
            <Ionicons name="grid" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <View
          style={[
            styles.listArea,
            USE_FULLSCREEN_OVERLAY && isFullscreenActive && styles.listAreaHidden,
          ]}
        >
          <Animated.View
            style={[styles.listAnimated, { transform: [{ translateX }] }]}
          >
            <FlatList
              data={pagedCameras}
              key={`${numColumns}-${page}-${focusKey}`}
              numColumns={numColumns}
              keyExtractor={(item) => item.iD_Camera.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={Platform.OS === "android"}
              contentContainerStyle={[
                styles.listContent,
                isEmpty && styles.listContentEmpty,
              ]}
              extraData={`${cameraToken}-${thumbTimestamp}-${focusKey}`}
              ListEmptyComponent={
                <EmptyState
                  iconName="videocam-outline"
                  title="Không có camera"
                  subtitle="Khu vực này chưa có camera để hiển thị"
                />
              }
            />
          </Animated.View>

          {totalPages > 1 && (
            <View
              style={[
                styles.paginationRow,
                {
                  backgroundColor: colors.surface,
                  paddingBottom: 10 + paginationBottomInset,
                },
              ]}
            >
              {visiblePageIndexes.map((i) => (
                <TouchableOpacity key={i} onPress={() => changePage(i)}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.borderStrong },
                      i === page && styles.dotActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Layout Modal */}
      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
      >
        <TouchableWithoutFeedback onPress={() => setShowLayoutModal(false)}>
          <View
            style={[
              styles.modalOverlay,
              isScreenLandscape && styles.modalOverlayLandscape,
            ]}
          >
            <View
              style={[
                styles.sheetContainer,
                isScreenLandscape && styles.sheetContainerLandscape,
                {
                  paddingBottom: insets.bottom || 16,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.handleWrapper}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: colors.borderStrong },
                  ]}
                />
              </View>
              <Text
                style={[styles.sheetTitle, { color: colors.text }]}
              >
                Bố trí cửa sổ
              </Text>
              <Text
                style={[styles.sheetTitleChild, { color: colors.textMuted }]}
              >
                Chọn số lượng cửa sổ
              </Text>
              {["1", "4", "8", "12", "16"].map((item, index) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.listItem,
                    index !== 0 && styles.itemBorder,
                    index !== 0 && { borderColor: separatorColor },
                    layoutCount === Number(item) && [
                      styles.activeItem,
                      { backgroundColor: colors.surfaceAlt },
                    ],
                  ]}
                  onPress={() => handleSetLayout(Number(item))}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      { color: colors.text },
                      layoutCount === Number(item) && styles.activeText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => setShowLayoutModal(false)}
              >
                <Text
                  style={[styles.closeText, { color: colors.text }]}
                >
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Lớp phủ trong cùng cây React thay cho <Modal>: mỗi Modal là một Dialog
          có window riêng, mà lệnh ẩn thanh hệ thống chỉ áp được lên window của
          Activity — để nguyên Modal thì Android vẫn chừa dải status bar và
          navigation bar/taskbar quanh video. */}
      {/* Vỏ fullscreen tách theo platform — xem USE_FULLSCREEN_OVERLAY ở đầu
          file để biết vì sao Android phải dùng lớp phủ còn iOS giữ Modal. */}
      {USE_FULLSCREEN_OVERLAY ? (
        isFullscreenActive && (
          <View style={styles.fullscreenOverlay}>
            <StatusBar hidden backgroundColor="#000" barStyle="light-content" />
            {fullscreenBody}
          </View>
        )
      ) : (
        <Modal
          visible={isFullscreenActive}
          animationType="fade"
          transparent={false}
          statusBarTranslucent={false}
          hardwareAccelerated
          supportedOrientations={[
            "portrait",
            "landscape-left",
            "landscape-right",
          ]}
          onRequestClose={closeFullscreen}
        >
          <StatusBar
            hidden={false}
            translucent={false}
            backgroundColor="#000"
            barStyle="light-content"
          />
          <View style={styles.fullscreenContainer}>{fullscreenBody}</View>
        </Modal>
      )}
    </GestureHandlerRootView>
  );
};

export default CameraList;
