import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  PermissionsAndroid,
  StatusBar,
  useWindowDimensions,
  InteractionManager,
  TouchableWithoutFeedback,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Orientation from "react-native-orientation-locker";
import Video from "react-native-video";
import WebView from "react-native-webview";
import type { CameraCellProps } from "../../types/components.d";
import { useIsFocused } from "@react-navigation/native";
import CameraSnapshotThumbnail from "./shared/CameraSnapshotThumbnail";
import {
  buildCameraFullscreenHTML,
  buildCameraGridStreamHTML,
} from "./shared/cameraStreamHtml";
import {
  broadcastCameraWebViewMessage,
  broadcastCameraWebViewToken,
  postCameraWebViewMessage,
  postCameraWebViewToken,
  setCameraWebViewTokenAndStart,
  startCameraWebView,
  stopCameraWebView,
} from "./shared/cameraWebViewMessaging";
import {
  CAMERA_LAYOUT_CHOICES,
  GO2RTC_HOST,
  LAYOUT_OPTIONS,
} from "./shared/cameraStreamConfig";
import {
  getCameraHlsUrl,
  getCameraLayoutLabel,
  getCameraSnapshotUrl,
  getVisiblePageIndexes,
} from "./shared/cameraStreamUtils";
import { useCameraViewToken } from "./shared/useCameraViewToken";
import EmptyState from "../ui/EmptyState";
import { createTabBarStyle } from "../../navigation/shared/tabBarTheme";

const PORTRAIT_CELL_ASPECT = 4 / 3;

// ─── Không dùng isLandscape state nữa — derive trực tiếp từ screenDims ───────
// Điều này đảm bảo layout luôn sync với kích thước thực tế của màn hình.

const CameraCell = React.memo(
  ({
    cam,
    idx,
    isActive,
    isPaused,
    isWebViewActive,
    isSnapshotActive,
    cellW,
    cellH,
    token,
    pageKey,
    thumbTimestamp,
    focusKey,
    onPress,
    onDoubleTap,
    webviewRefRegister,
    pongTimeoutRef,
    webviewRestartRef: _webviewRestartRef,
    onTokenExpired,
  }: CameraCellProps) => {
    const singleTap = React.useMemo(
      () =>
        Gesture.Tap()
          .runOnJS(true)
          .onEnd(() => onPress(cam, idx)),
      [cam, idx, onPress]
    );
    const doubleTap = React.useMemo(
      () =>
        Gesture.Tap()
          .runOnJS(true)
          .numberOfTaps(2)
          .onEnd(() => onDoubleTap(cam, idx)),
      [cam, idx, onDoubleTap]
    );
    const composed = React.useMemo(
      () => Gesture.Exclusive(doubleTap, singleTap),
      [doubleTap, singleTap]
    );

    const webviewRefCb = React.useCallback(
      (r: any) => {
        if (webviewRefRegister) {
          if (r) webviewRefRegister.current[cam.iD_Camera] = r;
          else delete webviewRefRegister.current[cam.iD_Camera];
        }
      },
      [cam.iD_Camera, webviewRefRegister]
    );

    const shouldRenderWebView = !isPaused && isWebViewActive && !!token;
    const shouldRenderSnapshot =
      !isPaused && !shouldRenderWebView && !!isSnapshotActive;

    React.useEffect(() => {
      if (
        Platform.OS !== "android" ||
        !shouldRenderWebView ||
        !token ||
        !webviewRefRegister?.current[cam.iD_Camera]?.postMessage
      )
        return;
      const timer = setTimeout(() => {
        const ref = webviewRefRegister.current[cam.iD_Camera];
        postCameraWebViewToken(ref, token);
      }, 150);
      return () => clearTimeout(timer);
    }, [cam.iD_Camera, shouldRenderWebView, token, webviewRefRegister]);

    return (
      <GestureDetector gesture={composed}>
        <View style={[styles.cell, { width: cellW, height: cellH }]}>
          {shouldRenderWebView ? (
            <WebView
              key={`webview-${cam.iD_Camera}-${pageKey}-${token}`}
              ref={webviewRefCb}
              source={{
                html: buildCameraGridStreamHTML(cam.iD_Camera_Ma),
                baseUrl: GO2RTC_HOST,
              }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled={false}
              androidLayerType="hardware"
              renderToHardwareTextureAndroid
              mixedContentMode="always"
              originWhitelist={["*"]}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              scrollEnabled={false}
              onLoad={() => {
                const ref = webviewRefRegister?.current[cam.iD_Camera];
                setCameraWebViewTokenAndStart(ref, token);
              }}
              onMessage={(e) => {
                const data = e.nativeEvent.data;
                if (data === "token_expired") onTokenExpired?.();
                else if (data === "pong") {
                  const timeoutMap = pongTimeoutRef?.current;
                  if (!timeoutMap) return;
                  const timeout = timeoutMap[cam.iD_Camera];
                  if (timeout) {
                    clearTimeout(timeout);
                    delete timeoutMap[cam.iD_Camera];
                  }
                }
              }}
            />
          ) : shouldRenderSnapshot && token && thumbTimestamp ? (
            <CameraSnapshotThumbnail
              cameraId={cam.iD_Camera}
              cameraCode={cam.iD_Camera_Ma}
              cameraToken={token}
              thumbTimestamp={thumbTimestamp}
              focusKey={focusKey}
            />
          ) : (
            <View style={styles.cellPlaceholder}>
              {!token && !isPaused ? (
                <ActivityIndicator size="small" color="#555" />
              ) : !isPaused ? (
                <Text style={styles.cellPlaceholderText}>
                  {isSnapshotActive
                    ? "Đang tải ảnh..."
                    : "Nhấn đúp để xem"}
                </Text>
              ) : null}
            </View>
          )}

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.cellTop}>
              {isActive && shouldRenderWebView && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Trực tiếp</Text>
                </View>
              )}
            </View>
            <View style={styles.cellBottom}>
              <Text style={styles.cellLabel} numberOfLines={1}>
                {cam.iD_Camera_MoTa ?? `CAM ${idx + 1}`}
              </Text>
            </View>
          </View>
          {isActive && (
            <View style={styles.activeBorder} pointerEvents="none" />
          )}
        </View>
      </GestureDetector>
    );
  },
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.isPaused === next.isPaused &&
    prev.isWebViewActive === next.isWebViewActive &&
    prev.isSnapshotActive === next.isSnapshotActive &&
    prev.cellW === next.cellW &&
    prev.cellH === next.cellH &&
    prev.token === next.token &&
    prev.pageKey === next.pageKey &&
    prev.thumbTimestamp === next.thumbTimestamp &&
    prev.focusKey === next.focusKey &&
    prev.cam.iD_Camera === next.cam.iD_Camera &&
    prev.onPress === next.onPress &&
    prev.onDoubleTap === next.onDoubleTap &&
    prev.webviewRefRegister === next.webviewRefRegister &&
    prev.pongTimeoutRef === next.pongTimeoutRef &&
    prev.webviewRestartRef === next.webviewRestartRef &&
    prev.onTokenExpired === next.onTokenExpired
);

const CameraListGrid: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { cameras = [] } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [layoutCount, setLayoutCount] = React.useState(16);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = React.useState(false);
  const [fullscreenCam, setFullscreenCam] = React.useState<any | null>(null);
  const [isFullMuted, setIsFullMuted] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [isClosingFullscreen, setIsClosingFullscreen] = React.useState(false);

  // ─── KEY CHANGE: Bỏ isLandscape state, dùng screenDims trực tiếp ────────────
  // isLandscape state cũ bị out-of-sync với orientation change event (lag ~100ms)
  // gây flash layout trước khi state cập nhật. Dùng screenDims.width > height
  // là source of truth duy nhất — nó luôn chính xác tại thời điểm render.
  const screenDims = useWindowDimensions();
  const isLandscape = screenDims.width > screenDims.height;

  // ─── Ref track landscape cho orientation lock logic ───────────────────────
  const isLandscapeRef = React.useRef(isLandscape);
  React.useEffect(() => {
    isLandscapeRef.current = isLandscape;
  }, [isLandscape]);

  const [fsVideoKey, setFsVideoKey] = React.useState(0);
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null
  );
  const [pageChangeKey, setPageChangeKey] = React.useState(0);
  const [focusKey, setFocusKey] = React.useState(0);
  const [isSwitchingFullscreen, setIsSwitchingFullscreen] =
    React.useState(false);
  const [isGridLandscapeFullscreen, setIsGridLandscapeFullscreen] =
    React.useState(false);

  const isGridLandscapeFullscreenRef = React.useRef(false);
  React.useEffect(() => {
    isGridLandscapeFullscreenRef.current = isGridLandscapeFullscreen;
  }, [isGridLandscapeFullscreen]);

  const webviewRefs = React.useRef<Record<string, any>>({});
  const fullscreenWebViewRef = React.useRef<any>(null);
  const isFocusedRef = React.useRef(false);
  const startStreamsTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const androidLiveStartTimeoutsRef = React.useRef<
    ReturnType<typeof setTimeout>[]
  >([]);
  const syncTokenTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const webviewPingIntervalRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const pongTimeoutRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const webviewMissCountRef = React.useRef<Record<string, number>>({});
  const lastProgressRef = React.useRef<number>(Date.now());
  const androidFallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const androidWatchdogRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  // ─── Ref để track pending navigation action ──────────────────────────────
  const pendingNavigationRef = React.useRef<any>(null);

  const pagedCamerasRef = React.useRef<any[]>([]);
  const translateX = React.useRef(new Animated.Value(0)).current;
  const fsTranslateX = React.useRef(new Animated.Value(0)).current;
  const fsSwitchOpacity = React.useRef(new Animated.Value(0)).current;
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);
  const [gridRenderKey, setGridRenderKey] = React.useState(0);
  const fullscreenCamRef = React.useRef<any>(null);
  const isClosingFullscreenRef = React.useRef(false);
  const closeFullscreenTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const SW = screenDims.width;
  const isGridFullscreenMode = isGridLandscapeFullscreen;
  const effectiveLayoutCount = layoutCount;
  const [cols, rows] = LAYOUT_OPTIONS[effectiveLayoutCount] ?? [4, 4];
  const perPage = cols * rows;
  const liveCellLimit =
    Platform.OS === "android"
      ? 0
      : perPage;
  const totalPages = Math.ceil(cameras.length / perPage);
  const pagedCameras = cameras.slice(page * perPage, (page + 1) * perPage);
  pagedCamerasRef.current = pagedCameras;
  const fullscreenIndex = fullscreenCam
    ? cameras.findIndex((cam: any) => cam.iD_Camera === fullscreenCam.iD_Camera)
    : -1;

  const {
    cameraToken,
    cameraTokenRef,
    clearTokenRefreshTimer,
    fetchCameraTokenRef,
    thumbTimestamp,
    tokenErrorMessage,
  } = useCameraViewToken({
    isFocused,
    onActive: () => {
      broadcastCameraWebViewMessage(webviewRefs.current, "start");
      startCameraWebView(fullscreenWebViewRef.current);
    },
    onBackground: () => {
      broadcastCameraWebViewMessage(webviewRefs.current, "stop");
      stopCameraWebView(fullscreenWebViewRef.current);
    },
    onTokenReceived: (newToken) => {
      broadcastCameraWebViewToken(webviewRefs.current, newToken);
      postCameraWebViewToken(fullscreenWebViewRef.current, newToken);
    },
  });

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCam && thumbTimestamp
      ? getCameraSnapshotUrl(fullscreenCam.iD_Camera_Ma, thumbTimestamp)
      : null);
  const visiblePageIndexes = React.useMemo(
    () => getVisiblePageIndexes(page, totalPages),
    [page, totalPages]
  );

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);
  React.useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  React.useEffect(() => {
    if (page < totalPages) return;
    setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  React.useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  React.useEffect(() => {
    if (!isGridFullscreenMode) return;
    setShowLayoutPicker(false);
  }, [isGridFullscreenMode]);

  React.useEffect(() => {
    fullscreenCamRef.current = fullscreenCam;
  }, [fullscreenCam]);

  const clearCloseFullscreenTimeout = React.useCallback(() => {
    if (closeFullscreenTimeoutRef.current) {
      clearTimeout(closeFullscreenTimeoutRef.current);
      closeFullscreenTimeoutRef.current = null;
    }
  }, []);

  const finishClosingFullscreen = React.useCallback(() => {
    if (!isClosingFullscreenRef.current) return;
    clearCloseFullscreenTimeout();
    setFullscreenCam(null);
    setIsClosingFullscreen(false);
    isClosingFullscreenRef.current = false;
  }, [clearCloseFullscreenTimeout]);

  React.useEffect(() => {
    isClosingFullscreenRef.current = isClosingFullscreen;
  }, [isClosingFullscreen]);

  // Khi screenDims về portrait → layout đã đúng → fade out cover rồi navigate
  React.useEffect(() => {
    if (!isLandscape) {
      finishClosingFullscreen();
    }
    if (isLandscape) return;
    const action = pendingNavigationRef.current;
    if (!action) return;
    pendingNavigationRef.current = null;
    navigation.dispatch(action);
  }, [finishClosingFullscreen, isLandscape, navigation]);

  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      clearCloseFullscreenTimeout();
      Orientation.lockToPortrait();
      navigation.setOptions({ gestureEnabled: true, headerShown: true });
    };
  }, [clearCloseFullscreenTimeout, navigation]);

  React.useEffect(() => {
    navigation.setOptions({ headerShown: !isGridLandscapeFullscreen });
  }, [isGridLandscapeFullscreen, navigation]);

  React.useEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.setOptions({
      tabBarStyle: isGridFullscreenMode
        ? { display: "none" }
        : [createTabBarStyle({ bottomInset: insets.bottom })],
    });

    return () => {
      tabNavigation.setOptions({
        tabBarStyle: [createTabBarStyle({ bottomInset: insets.bottom })],
      });
    };
  }, [insets.bottom, isGridFullscreenMode, navigation]);

  const stopAllStreams = React.useCallback(() => {
    if (startStreamsTimeoutRef.current) {
      clearTimeout(startStreamsTimeoutRef.current);
      startStreamsTimeoutRef.current = null;
    }
    broadcastCameraWebViewMessage(webviewRefs.current, "stop");
    stopCameraWebView(fullscreenWebViewRef.current);
  }, []);

  const clearAndroidLiveStartRetries = React.useCallback(() => {
    androidLiveStartTimeoutsRef.current.forEach(clearTimeout);
    androidLiveStartTimeoutsRef.current = [];
  }, []);

  const clearGridWebViewRefs = React.useCallback(() => {
    Object.values(pongTimeoutRef.current).forEach(clearTimeout);
    pongTimeoutRef.current = {};
    webviewMissCountRef.current = {};
    webviewRefs.current = {};
  }, []);

  const restartGridWebView = React.useCallback(
    (cameraId: string | number) => {
      const key = String(cameraId);
      const ref = webviewRefs.current[key];
      const token = cameraTokenRef.current;
      if (!token) return;
      stopCameraWebView(ref);
      setTimeout(() => {
        const nextRef = webviewRefs.current[key];
        setCameraWebViewTokenAndStart(nextRef, token);
      }, 150);
    },
    [cameraTokenRef]
  );

  const webviewRestartRef = React.useRef(restartGridWebView);
  React.useEffect(() => {
    webviewRestartRef.current = restartGridWebView;
  }, [restartGridWebView]);

  const startAllStreams = React.useCallback(() => {
    if (startStreamsTimeoutRef.current)
      clearTimeout(startStreamsTimeoutRef.current);
    startStreamsTimeoutRef.current = setTimeout(() => {
      if (!isFocusedRef.current) return;
      broadcastCameraWebViewMessage(webviewRefs.current, "start");
      startCameraWebView(fullscreenWebViewRef.current);
      startStreamsTimeoutRef.current = null;
    }, 300);
  }, []);

  const resetGridSwipeOffset = React.useCallback(() => {
    translateX.stopAnimation(() => {
      translateX.setValue(0);
    });
  }, [translateX]);

  const startVisibleAndroidLiveStreams = React.useCallback(
    (pageSnapshot = pageRef.current) => {
      if (Platform.OS !== "android") return;
      if (!isFocusedRef.current || isPaused) return;
      if (fullscreenCamRef.current) return;
      if (pageRef.current !== pageSnapshot) return;

      const token = cameraTokenRef.current;
      if (!token) return;

      const liveCameras = cameras
        .slice(pageSnapshot * perPage, (pageSnapshot + 1) * perPage)
        .slice(0, liveCellLimit);

      liveCameras.forEach((cam: any) => {
        const ref = webviewRefs.current[cam.iD_Camera];
        if (!ref?.postMessage) return;
        setCameraWebViewTokenAndStart(ref, token);
        postCameraWebViewMessage(ref, isMuted ? "mute" : "unmute");
      });
    },
    [cameraTokenRef, cameras, isMuted, isPaused, liveCellLimit, perPage]
  );

  const scheduleVisibleAndroidLiveStartRetries = React.useCallback(
    (pageSnapshot = pageRef.current) => {
      clearAndroidLiveStartRetries();
      if (Platform.OS !== "android") return;

      androidLiveStartTimeoutsRef.current = [250, 700, 1300, 2200].map(
        (delay) =>
          setTimeout(() => {
            startVisibleAndroidLiveStreams(pageSnapshot);
          }, delay)
      );
    },
    [clearAndroidLiveStartRetries, startVisibleAndroidLiveStreams]
  );

  useFocusEffect(
    React.useCallback(() => {
      Orientation.lockToPortrait();
      setFocusKey((k) => k + 1);
      fetchCameraTokenRef.current?.(false);
      startAllStreams();
      return () => {
        clearTokenRefreshTimer();
        if (syncTokenTimeoutRef.current) {
          clearTimeout(syncTokenTimeoutRef.current);
          syncTokenTimeoutRef.current = null;
        }
        stopAllStreams();
      };
    }, [
      clearTokenRefreshTimer,
      fetchCameraTokenRef,
      startAllStreams,
      stopAllStreams,
    ])
  );

  React.useEffect(() => {
    if (!isFocused) stopAllStreams();
  }, [isFocused, stopAllStreams]);

  React.useEffect(() => {
    if (!cameraToken) return;
    if (syncTokenTimeoutRef.current) clearTimeout(syncTokenTimeoutRef.current);
    syncTokenTimeoutRef.current = setTimeout(() => {
      if (!isFocusedRef.current) return;
      broadcastCameraWebViewToken(webviewRefs.current, cameraToken);
      postCameraWebViewToken(fullscreenWebViewRef.current, cameraToken);
      syncTokenTimeoutRef.current = null;
    }, 300);
    return () => {
      if (syncTokenTimeoutRef.current) {
        clearTimeout(syncTokenTimeoutRef.current);
        syncTokenTimeoutRef.current = null;
      }
    };
  }, [cameraToken, focusKey]);

  React.useEffect(() => {
    if (Platform.OS !== "android" || !isFocused || isPaused || !cameraToken)
      return;
    if (fullscreenCamRef.current) return;
    if (fullscreenCam) return;

    scheduleVisibleAndroidLiveStartRetries(pageRef.current);
    return clearAndroidLiveStartRetries;
  }, [
    cameraToken,
    clearAndroidLiveStartRetries,
    fullscreenCam,
    isFocused,
    isPaused,
    pageChangeKey,
    focusKey,
    scheduleVisibleAndroidLiveStartRetries,
  ]);

  React.useEffect(() => {
    if (!isFocused) {
      stopAllStreams();
      return;
    }
    if (isPaused) {
      stopAllStreams();
      return;
    }
    if (!cameraToken) return;
    if (fullscreenCamRef.current) return;
    if (fullscreenCam) return;

    const timer = setTimeout(() => {
      if (!isFocusedRef.current || isPaused) return;
      startAllStreams();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    cameraToken,
    focusKey,
    fullscreenCam,
    isFocused,
    isPaused,
    layoutCount,
    page,
    pageChangeKey,
    startAllStreams,
    stopAllStreams,
  ]);

  React.useEffect(() => {
    const msg = isMuted ? "mute" : "unmute";
    broadcastCameraWebViewMessage(webviewRefs.current, msg);
  }, [isMuted]);

  React.useEffect(() => {
    postCameraWebViewMessage(
      fullscreenWebViewRef.current,
      isFullMuted ? "mute" : "unmute"
    );
  }, [isFullMuted]);

  React.useEffect(() => {
    if (!videoReady) return;
    setPendingThumbUrl(null);
    if (!isSwitchingFullscreen) return;
    Animated.timing(fsSwitchOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setIsSwitchingFullscreen(false);
    });
  }, [fsSwitchOpacity, isSwitchingFullscreen, videoReady]);

  React.useEffect(() => {
    if (fullscreenCamRef.current) return;
    if (!isFocused) stopAllStreams();
  }, [isFocused, stopAllStreams]);

  React.useEffect(() => {
    if (webviewPingIntervalRef.current)
      clearInterval(webviewPingIntervalRef.current);
    webviewPingIntervalRef.current = setInterval(() => {
      if (!isFocusedRef.current) return;
      Object.entries(webviewRefs.current).forEach(([id, ref]) => {
        const pendingTimeout = pongTimeoutRef.current[id];
        if (pendingTimeout) clearTimeout(pendingTimeout);
        postCameraWebViewMessage(ref, "ping");
        pongTimeoutRef.current[id] = setTimeout(() => {
          const missCount = (webviewMissCountRef.current[id] ?? 0) + 1;
          webviewMissCountRef.current[id] = missCount;
          if (missCount >= 2) {
            webviewMissCountRef.current[id] = 0;
            webviewRestartRef.current?.(id);
          }
        }, 10000);
      });
    }, 30000);
    const pongTimeouts = pongTimeoutRef.current;
    return () => {
      if (webviewPingIntervalRef.current)
        clearInterval(webviewPingIntervalRef.current);
      Object.values(pongTimeouts).forEach(clearTimeout);
    };
  }, []);

  const handleTokenExpired = React.useCallback(() => {
    fetchCameraTokenRef.current?.(true);
  }, [fetchCameraTokenRef]);

  const clearFullscreenPlaybackTimers = React.useCallback(() => {
    if (androidFallbackRef.current) {
      clearTimeout(androidFallbackRef.current);
      androidFallbackRef.current = null;
    }
    if (androidWatchdogRef.current) {
      clearInterval(androidWatchdogRef.current);
      androidWatchdogRef.current = null;
    }
  }, []);

  const startAndroidWatchdog = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    lastProgressRef.current = Date.now();
    androidWatchdogRef.current = setInterval(() => {
      if (Date.now() - lastProgressRef.current > 18000) {
        if (androidWatchdogRef.current)
          clearInterval(androidWatchdogRef.current);
        if (androidFallbackRef.current)
          clearTimeout(androidFallbackRef.current);
        setVideoReady(false);
        setFsVideoKey((k) => k + 1);
        startAndroidFallbackRef.current?.();
      }
    }, 6000);
  }, []);

  const startAndroidFallbackRef = React.useRef<() => void>(null as any);
  const startAndroidFallback = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    startAndroidWatchdog();
    androidFallbackRef.current = setTimeout(() => setVideoReady(true), 8000);
  }, [startAndroidWatchdog]);

  React.useEffect(() => {
    startAndroidFallbackRef.current = startAndroidFallback;
  }, [startAndroidFallback]);

  const handleAndroidReady = React.useCallback(() => {
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    lastProgressRef.current = Date.now();
    setVideoReady(true);
  }, []);

  React.useEffect(() => {
    return () => {
      stopAllStreams();
      if (startStreamsTimeoutRef.current)
        clearTimeout(startStreamsTimeoutRef.current);
      if (syncTokenTimeoutRef.current)
        clearTimeout(syncTokenTimeoutRef.current);
      clearAndroidLiveStartRetries();
      if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
      if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    };
  }, [clearAndroidLiveStartRetries, stopAllStreams]);

  const PAGINATION_H = 28;
  // Dùng kích thước thực tế theo hướng hiện tại của màn hình.
  // portraitScreenW = cạnh ngắn (chiều rộng khi dọc), landscapeScreenW = cạnh dài.
  const portraitScreenW = Math.min(screenDims.width, screenDims.height);
  const landscapeScreenW = Math.max(screenDims.width, screenDims.height);
  const landscapeScreenH = Math.min(screenDims.width, screenDims.height);

  // ─── FIX: grid bị "dài" hơn khi rows > cols (ví dụ layout 3x4) ─────────────
  // Trước đây portraitGridMaxH chỉ là 60% chiều dài màn hình — một cap cố định
  // không phụ thuộc cols/rows. Với layout vuông (2x2, 3x3, 4x4...) tổng chiều cao
  // luôn ra cùng 1 giá trị baseline (vì cols/rows triệt tiêu nhau trong phép tính
  // theo tỉ lệ 4:3). Nhưng với layout có rows > cols (như 3x4), chiều cao tính theo
  // tỉ lệ 4:3 sẽ LỚN HƠN baseline đó, và vì cap 60% quá rộng nên không kịp ghìm lại
  // → grid bị dài hẳn ra so với các layout vuông khác.
  // Cách sửa: dùng đúng baseline của layout vuông (portraitScreenW / aspect) làm cap
  // chung cho MỌI layout. Layout có rows >= cols sẽ luôn bị ghìm về đúng baseline này
  // (cell nhỏ lại, có thể có viền 2 bên), còn layout có cols > rows vẫn ngắn hơn bình
  // thường (không bị ảnh hưởng, vì baseline lúc đó không phải là constraint nhỏ nhất).
  const portraitGridBaselineH = portraitScreenW / PORTRAIT_CELL_ASPECT;
  const portraitGridMaxH = Math.min(
    portraitGridBaselineH,
    Math.max(screenDims.width, screenDims.height) * 0.6
  );
  const portraitCellWByWidth = portraitScreenW / cols;
  const portraitCellHByHeight = portraitGridMaxH / rows;

  // Giữ tỉ lệ 4:3 nhưng đảm bảo không vượt quá chiều cao cho phép
  const portraitCellH = Math.min(
    portraitCellWByWidth / PORTRAIT_CELL_ASPECT,
    portraitCellHByHeight
  );

  const portraitCellW = portraitScreenW / cols;
  const landscapeCellW = landscapeScreenW / cols;
  const landscapeCellH = landscapeScreenH / rows;
  // ─── KEY CHANGE: Khung đi theo hướng màn hình thực tế (isLandscape) ──
  // Không phụ thuộc isGridFullscreenMode nữa, để xoay ngang/dọc luôn đổi khung.
  // isGridFullscreenMode chỉ dùng để control tabBar/header visibility.
  const cellW = isLandscape ? landscapeCellW : portraitCellW;
  const cellH = isLandscape ? landscapeCellH : portraitCellH;
  const gridW = cellW * cols;
  const gridH = cellH * rows;
  const topHalfH = isLandscape ? landscapeScreenH : gridH + PAGINATION_H;

  const changePage = React.useCallback(
    (newPage: number) => {
      clearAndroidLiveStartRetries();
      stopAllStreams();
      clearGridWebViewRefs();
      setPage(newPage);
      setActiveIndex(0);
      setGridRenderKey((k) => k + 1);
      setPageChangeKey((k) => k + 1);
    },
    [clearAndroidLiveStartRetries, clearGridWebViewRefs, stopAllStreams]
  );

  const swipeGesture = Gesture.Pan()
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
      const THRESHOLD = SW * 0.3;
      if (e.translationX < -THRESHOLD && curPage < total - 1) {
        Animated.timing(translateX, {
          toValue: -SW,
          duration: 250,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          translateX.setValue(0);
          changePage(curPage + 1);
        });
      } else if (e.translationX > THRESHOLD && curPage > 0) {
        Animated.timing(translateX, {
          toValue: SW,
          duration: 250,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
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
    });

  const handleSetLayout = (count: number) => {
    stopAllStreams();
    setLayoutCount(count);
    setPage(0);
    setActiveIndex(0);
    setShowLayoutPicker(false);
    setGridRenderKey((k) => k + 1);
    setPageChangeKey((k) => k + 1);
  };

  const handleCamPress = React.useCallback((_: any, idx: number) => {
    setActiveIndex(idx);
  }, []);

  const openGridLandscapeFullscreen = React.useCallback(() => {
    resetGridSwipeOffset();
    setShowLayoutPicker(false);
    setIsGridLandscapeFullscreen(true);
    Orientation.lockToLandscapeLeft();
  }, [resetGridSwipeOffset]);

  const closeGridLandscapeFullscreen = React.useCallback(() => {
    if (!isGridLandscapeFullscreenRef.current) return;
    resetGridSwipeOffset();
    setIsGridLandscapeFullscreen(false);
    Orientation.lockToPortrait();
  }, [resetGridSwipeOffset]);

  const handleCamDoubleTap = React.useCallback(
    (cam: any, idx: number) => {
      clearCloseFullscreenTimeout();
      isClosingFullscreenRef.current = false;
      setIsClosingFullscreen(false);
      // ─── KEY CHANGE: Không set isLandscape state nữa, Orientation.lock sẽ
      // thay đổi screenDims và isLandscape sẽ tự derive đúng ───────────────
      if (isGridLandscapeFullscreenRef.current) {
        Orientation.lockToLandscapeLeft();
      } else {
        Orientation.lockToPortrait();
      }
      setPendingThumbUrl(
        getCameraSnapshotUrl(cam.iD_Camera_Ma, thumbTimestamp)
      );
      setActiveIndex(idx);
      setVideoReady(false);
      setFsVideoKey(0);
      fsTranslateX.setValue(0);
      fsSwitchOpacity.setValue(0);
      setIsSwitchingFullscreen(false);
      setFullscreenCam(cam);
      if (Platform.OS === "android") startAndroidFallback();
    },
    [
      clearCloseFullscreenTimeout,
      fsSwitchOpacity,
      fsTranslateX,
      startAndroidFallback,
      thumbTimestamp,
    ]
  );

  const switchFullscreenCamera = React.useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      const nextCam = cameras[nextIndex];
      if (!nextCam) return;

      stopCameraWebView(fullscreenWebViewRef.current);
      if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
      if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);

      const nextPage = Math.floor(nextIndex / perPage);
      const nextLocalIndex = nextIndex % perPage;

      setPendingThumbUrl(
        getCameraSnapshotUrl(nextCam.iD_Camera_Ma, thumbTimestamp)
      );
      setVideoReady(false);
      setFsVideoKey(0);
      setFullscreenCam(nextCam);
      setActiveIndex(nextLocalIndex);

      if (nextPage !== pageRef.current) {
        setPage(nextPage);
      }

      fsTranslateX.setValue(direction === "next" ? SW : -SW);
      Animated.timing(fsTranslateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
      if (Platform.OS === "android") startAndroidFallback();
    },
    [cameras, fsTranslateX, perPage, startAndroidFallback, SW, thumbTimestamp]
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

      setIsSwitchingFullscreen(true);
      Animated.timing(fsSwitchOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();

      const switchNow = () => switchFullscreenCamera(nextIndex, direction);

      if (!animateOut) {
        switchNow();
        return;
      }

      Animated.timing(fsTranslateX, {
        toValue: direction === "next" ? -SW : SW,
        duration: 220,
        useNativeDriver: true,
      }).start(switchNow);
    },
    [
      cameras.length,
      fsSwitchOpacity,
      fsTranslateX,
      fullscreenIndex,
      switchFullscreenCamera,
      SW,
    ]
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
              : e.translationX
          );
        })
        .onEnd((e) => {
          if (fullscreenIndex < 0) return;
          const THRESHOLD = SW * 0.22;
          if (
            e.translationX < -THRESHOLD &&
            fullscreenIndex < cameras.length - 1
          ) {
            Animated.timing(fsTranslateX, {
              toValue: -SW,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              handleFullscreenSwipe("next", false);
            });
          } else if (e.translationX > THRESHOLD && fullscreenIndex > 0) {
            Animated.timing(fsTranslateX, {
              toValue: SW,
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
    [SW, cameras.length, fsTranslateX, fullscreenIndex, handleFullscreenSwipe]
  );

  const handleSnapshot = React.useCallback(async () => {
    const activeCam = pagedCamerasRef.current[activeIndex];
    const token = cameraTokenRef.current;
    if (!activeCam || !token) return;
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Không có quyền", "Cần quyền lưu trữ để chụp ảnh.");
          return;
        }
      }
      const url = `${GO2RTC_HOST}/api/frame.jpeg?src=${
        activeCam.iD_Camera_Ma
      }_snap&t=${Date.now()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Fetch failed");
      Alert.alert("Chụp ảnh", "Đã chụp ảnh thành công.");
    } catch (e) {
      Alert.alert("Lỗi", "Không thể chụp ảnh camera.");
    }
  }, [activeIndex, cameraTokenRef]);

  const closeFullscreen = React.useCallback(() => {
    clearFullscreenPlaybackTimers();
    clearCloseFullscreenTimeout();

    fsTranslateX.setValue(0);
    fsSwitchOpacity.setValue(0);
    setIsSwitchingFullscreen(false);
    setPendingThumbUrl(null);
    setFsVideoKey(0);
    setVideoReady(false);

    if (isGridLandscapeFullscreenRef.current) {
      Orientation.lockToLandscapeLeft();
      setFullscreenCam(null);
      setIsClosingFullscreen(false);
      isClosingFullscreenRef.current = false;
    } else {
      isClosingFullscreenRef.current = true;
      setIsClosingFullscreen(true);
      Orientation.lockToPortrait();
      if (!isLandscapeRef.current) {
        closeFullscreenTimeoutRef.current = setTimeout(() => {
          closeFullscreenTimeoutRef.current = null;
          finishClosingFullscreen();
        }, 120);
      } else {
        closeFullscreenTimeoutRef.current = setTimeout(() => {
          closeFullscreenTimeoutRef.current = null;
          finishClosingFullscreen();
        }, 500);
      }
    }

    // Dùng InteractionManager thay setTimeout — restart sau khi animations settle
    InteractionManager.runAfterInteractions(() => {
      if (!isFocusedRef.current) return;
      Object.values(webviewRefs.current).forEach((ref) =>
        ref?.postMessage?.("start")
      );
    });
  }, [
    clearCloseFullscreenTimeout,
    clearFullscreenPlaybackTimers,
    finishClosingFullscreen,
    fsSwitchOpacity,
    fsTranslateX,
  ]);

  // ─── KEY CHANGE: toggleFullscreenOrientation không set isLandscape state ─
  const toggleFullscreenOrientation = React.useCallback(() => {
    if (isLandscape) {
      Orientation.lockToPortrait();
    } else {
      Orientation.lockToLandscapeLeft();
    }
    // screenDims sẽ tự update → isLandscape tự derive đúng
  }, [isLandscape]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      // ─── KEY CHANGE: Đơn giản hóa beforeRemove ────────────────────────────
      // Cũ: lock portrait → set cover visible → setTimeout 700ms → navigate
      // Mới: lock portrait → lưu action vào ref → navigate khi screenDims đã portrait
      // Không có cover màn hình đen, không có timeout chain.

      if (fullscreenCam) {
        event.preventDefault();
        closeFullscreen();
        return;
      }

      if (isGridLandscapeFullscreenRef.current || isLandscapeRef.current) {
        event.preventDefault();
        setIsGridLandscapeFullscreen(false);
        pendingNavigationRef.current = event.data.action;
        Orientation.lockToPortrait();
        // Navigation sẽ được dispatch trong useEffect khi isLandscape trở về false
        return;
      }
    });

    return unsubscribe;
  }, [closeFullscreen, fullscreenCam, navigation]);

  const fullscreenDoubleTapGesture = React.useMemo(
    () => Gesture.Tap().runOnJS(true).numberOfTaps(2).onEnd(closeFullscreen),
    [closeFullscreen]
  );
  const fullscreenGesture = React.useMemo(
    () =>
      Gesture.Simultaneous(fullscreenSwipeGesture, fullscreenDoubleTapGesture),
    [fullscreenDoubleTapGesture, fullscreenSwipeGesture]
  );

  if (tokenErrorMessage) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.offlineState}>
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải dữ liệu Camera"
            subtitle={tokenErrorMessage}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        hidden={
          isGridFullscreenMode || fullscreenCam !== null || isClosingFullscreen
        }
      />

      <GestureDetector gesture={swipeGesture}>
        <View
          style={[
            styles.topHalf,
            { height: topHalfH },
            (isGridFullscreenMode || isLandscape) && styles.topHalfFullscreen,
          ]}
        >
          <View style={[styles.gridViewport, { width: gridW, height: gridH }]}>
            <Animated.View
              style={[
                styles.grid,
                { width: gridW, height: gridH, transform: [{ translateX }] },
              ]}
            >
              {pagedCameras.map((cam: any, idx: number) => {
                const isAndroidSnapshot =
                  Platform.OS === "android" && idx >= liveCellLimit;
                return (
                  <CameraCell
                    key={`${gridRenderKey}-${cam.iD_Camera?.toString() ?? idx}`}
                    cam={cam}
                    idx={idx}
                    isActive={idx === activeIndex}
                    isPaused={isPaused}
                    isWebViewActive={idx < liveCellLimit}
                    isSnapshotActive={isAndroidSnapshot}
                    cellW={cellW}
                    cellH={cellH}
                    token={cameraToken}
                    pageKey={pageChangeKey}
                    thumbTimestamp={thumbTimestamp}
                    focusKey={focusKey}
                    onPress={
                      isGridLandscapeFullscreen
                        ? handleCamDoubleTap
                        : handleCamPress
                    }
                    onDoubleTap={
                      isGridLandscapeFullscreen
                        ? closeGridLandscapeFullscreen
                        : handleCamDoubleTap
                    }
                    webviewRefRegister={webviewRefs}
                    pongTimeoutRef={pongTimeoutRef}
                    webviewRestartRef={webviewRestartRef}
                    onTokenExpired={handleTokenExpired}
                  />
                );
              })}
            </Animated.View>
          </View>

          {!isGridFullscreenMode && !isLandscape && (
            <View style={styles.paginationRow}>
              {visiblePageIndexes.map((i) => (
                <TouchableOpacity key={i} onPress={() => changePage(i)}>
                  <View style={[styles.dot, i === page && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </GestureDetector>

      {!isGridFullscreenMode && !isLandscape && (
        <View style={[styles.bottomHalf, { paddingBottom: insets.bottom }]}>
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setIsPaused((v) => !v)}
            >
              <Ionicons
                name={isPaused ? "play-outline" : "pause-outline"}
                size={26}
                color="#444"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setIsMuted((v) => !v)}
            >
              <Ionicons
                name={isMuted ? "volume-mute-outline" : "volume-medium-outline"}
                size={26}
                color={isMuted ? "#e53935" : "#444"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn}>
              <View style={styles.sdBadge}>
                <Text style={styles.sdText}>SD</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setShowLayoutPicker((v) => !v)}
            >
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={26}
                color="#444"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={openGridLandscapeFullscreen}
            >
              <MaterialCommunityIcons
                name="phone-rotate-landscape"
                size={26}
                color="#444"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.playbackBtn, styles.playbackBtnDisabled]}
              disabled
            >
              <Ionicons name="play" size={16} color="#bbb" />
              <Text style={[styles.playbackText, styles.playbackTextDisabled]}>
                Phát lại
              </Text>
            </TouchableOpacity>
            <View style={styles.iconGroup}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleSnapshot}>
                <Ionicons name="camera-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="mic-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="person-circle-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chevronWrapper}>
            <Ionicons name="chevron-down" size={20} color="#aaa" />
          </View>
        </View>
      )}

      <Modal
        visible={showLayoutPicker && !isGridFullscreenMode}
        animationType="slide"
        transparent
        statusBarTranslucent
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
        onRequestClose={() => setShowLayoutPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLayoutPicker(false)}>
          <View
            style={[
              styles.modalOverlay,
              isLandscape && styles.modalOverlayLandscape,
            ]}
          >
            <View
              style={[
                styles.sheetContainer,
                isLandscape && styles.sheetContainerLandscape,
                { paddingBottom: insets.bottom || 16 },
              ]}
            >
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.sheetTitle} allowFontScaling={false}>
                Bố trí cửa sổ
              </Text>
              <Text style={styles.sheetTitleChild} allowFontScaling={false}>
                Chọn số lượng cửa sổ
              </Text>
              {CAMERA_LAYOUT_CHOICES.map((n, index) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.listItem,
                    index !== 0 && styles.itemBorder,
                    layoutCount === n && styles.activeItem,
                  ]}
                  onPress={() => handleSetLayout(n)}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      layoutCount === n && styles.activeText,
                    ]}
                    allowFontScaling={false}
                  >
                    {getCameraLayoutLabel(n)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowLayoutPicker(false)}
              >
                <Text style={styles.closeText} allowFontScaling={false}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={fullscreenCam !== null || isClosingFullscreen}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fsContainer}>
          <View
            style={[
              styles.fsHeader,
              isLandscape
                ? [styles.fsHeaderLandscape, { paddingLeft: insets.left || 16 }]
                : styles.fsHeaderPortrait,
            ]}
          >
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={closeFullscreen}
            >
              <Ionicons name="chevron-down" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fsTitle} numberOfLines={1}>
              {fullscreenCam?.iD_Camera_MoTa ?? "Camera"}
            </Text>
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
              onPress={toggleFullscreenOrientation}
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

          <GestureDetector gesture={fullscreenGesture}>
            <Animated.View
              style={[
                styles.fsVideoArea,
                { transform: [{ translateX: fsTranslateX }] },
              ]}
            >
              {isClosingFullscreen ? null : fullscreenCam && cameraToken ? (
                <>
                  {Platform.OS === "android" && (
                    <Video
                      key={`${fullscreenCam.iD_Camera}-${fsVideoKey}`}
                      source={{
                        uri: getCameraHlsUrl(fullscreenCam.iD_Camera_Ma),
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
                      hideShutterView
                      bufferConfig={{
                        minBufferMs: 1000,
                        maxBufferMs: 3000,
                        bufferForPlaybackMs: 500,
                        bufferForPlaybackAfterRebufferMs: 1000,
                      }}
                      onReadyForDisplay={handleAndroidReady}
                      onProgress={() => {
                        lastProgressRef.current = Date.now();
                      }}
                      onError={() => {
                        if (androidFallbackRef.current)
                          clearTimeout(androidFallbackRef.current);
                        if (androidWatchdogRef.current)
                          clearInterval(androidWatchdogRef.current);
                        androidFallbackRef.current = setTimeout(() => {
                          setVideoReady(false);
                          setFsVideoKey((k) => k + 1);
                          startAndroidFallback();
                        }, 5000);
                      }}
                    />
                  )}

                  {Platform.OS === "ios" && (
                    <WebView
                      key={`fs-${fullscreenCam.iD_Camera}`}
                      ref={fullscreenWebViewRef}
                      source={{
                        html: buildCameraFullscreenHTML(
                          fullscreenCam.iD_Camera_Ma
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
                          cameraToken
                        );
                      }}
                      onMessage={(e) => {
                        const data = e.nativeEvent.data;
                        if (data === "ready") setVideoReady(true);
                        else if (data === "token_expired")
                          fetchCameraTokenRef.current?.(true);
                        else if (data === "close_fullscreen") closeFullscreen();
                        else if (data === "swipe_next")
                          handleFullscreenSwipe("next");
                        else if (data === "swipe_prev")
                          handleFullscreenSwipe("prev");
                        else if (data === "pong") {
                          if (pongTimeoutRef.current.fullscreen) {
                            clearTimeout(pongTimeoutRef.current.fullscreen);
                          }
                        }
                      }}
                    />
                  )}

                  {!videoReady && (
                    <View style={StyleSheet.absoluteFill}>
                      {displayThumbUrl && (
                        <Image
                          source={{
                            uri: displayThumbUrl,
                            headers: { Authorization: `Bearer ${cameraToken}` },
                          }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="contain"
                          blurRadius={2}
                        />
                      )}
                      <View style={styles.thumbOverlay} />
                      <ActivityIndicator
                        size="large"
                        color="#fff"
                        style={styles.spinner}
                      />
                    </View>
                  )}
                  {Platform.OS === "android" && (
                    <GestureDetector gesture={fullscreenGesture}>
                      <View style={styles.fsSwipeOverlay} />
                    </GestureDetector>
                  )}
                  {isSwitchingFullscreen && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.fsSwitchOverlay,
                        { opacity: fsSwitchOpacity },
                      ]}
                    >
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.fsSwitchText}>
                        Đang chuyển camera...
                      </Text>
                      {cameras.length > 1 && fullscreenIndex >= 0 && (
                        <Text style={styles.fsSwitchCount}>
                          {fullscreenIndex + 1} / {cameras.length}
                        </Text>
                      )}
                    </Animated.View>
                  )}
                </>
              ) : fullscreenCam ? (
                <ActivityIndicator
                  size="large"
                  color="#fff"
                  style={styles.spinner}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>

          <View
            style={[
              styles.fsFooter,
              isLandscape
                ? [
                    styles.fsFooterLandscape,
                    { paddingRight: insets.right || 16 },
                  ]
                : styles.fsFooterPortrait,
            ]}
          >
            {fullscreenIndex >= 0 && cameras.length > 0 && (
              <Text style={styles.fsPagerText}>
                {fullscreenIndex + 1} / {cameras.length}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

export default CameraListGrid;

const styles = StyleSheet.create({
  root: { flex: 1 },
  offlineState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  topHalf: {
    backgroundColor: "#000",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topHalfFullscreen: { flex: 1, justifyContent: "center" },
  gridViewport: { backgroundColor: "#000", overflow: "hidden" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    backgroundColor: "#111",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
  },
  activeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#e53935",
  },
  cellTop: { flexDirection: "row", padding: 4 },
  cellBottom: {
    marginTop: "auto" as any,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  cellLabel: { color: "#fff", fontSize: 8 },
  cellPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  cellPlaceholderText: { color: "#555", fontSize: 8, textAlign: "center" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.9)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  paginationRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 28,
    backgroundColor: "#fff",
    gap: 4,
    paddingHorizontal: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ccc" },
  dotActive: {
    width: 22,
    height: 7,
    backgroundColor: "#e53935",
    borderRadius: 4,
  },
  bottomHalf: { flex: 4, backgroundColor: "#f7f7f7" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 18,
  },
  toolBtn: { alignItems: "center", justifyContent: "center" },
  sdBadge: {
    borderWidth: 1.5,
    borderColor: "#444",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sdText: { fontSize: 12, fontWeight: "700", color: "#444" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginHorizontal: 20,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  playbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ececec",
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginRight: 20,
  },
  playbackBtnDisabled: { opacity: 0.5 },
  playbackText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  playbackTextDisabled: { color: "#bbb" },
  iconGroup: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: { alignItems: "center", paddingBottom: 8 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalOverlayLandscape: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContainerLandscape: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
  },
  handleWrapper: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 45, height: 5, backgroundColor: "#ccc", borderRadius: 3 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  sheetTitleChild: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: "#aaa",
  },
  listItem: { paddingVertical: 16, paddingHorizontal: 20 },
  listItemText: { fontSize: 16, color: "#333", textAlign: "center" },
  itemBorder: { borderTopWidth: 0.5, borderColor: "#e5e5e5" },
  activeItem: { backgroundColor: "#f5f5f5" },
  activeText: { color: "red", fontWeight: "600" },
  closeBtn: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeText: { fontSize: 16, fontWeight: "600", color: "#333" },
  fsContainer: { flex: 1, backgroundColor: "#000" },
  fsVideoArea: { flex: 1, backgroundColor: "#000" },
  fsSwipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 5,
  },
  fsSwitchOverlay: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 8,
  },
  fsSwitchText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  fsSwitchCount: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 3,
  },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fsHeaderBtn: { padding: 6 },
  fsHeaderLandscape: { paddingTop: 48 },
  fsHeaderPortrait: { paddingTop: 48 },
  fsTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 4,
  },
  fsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  fsFooterLandscape: { paddingBottom: 48 },
  fsFooterPortrait: { paddingBottom: 48 },
  fsPagerText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  visibleVideo: { opacity: 1 },
  hiddenVideo: { opacity: 0 },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  spinner: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -18,
  },
});
