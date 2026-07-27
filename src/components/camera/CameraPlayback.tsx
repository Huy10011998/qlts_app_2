import React from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Video from "react-native-video";
import WebView from "react-native-webview";
import LinearGradient from "react-native-linear-gradient";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Orientation from "react-native-orientation-locker";
import { C, useHairlineBorderColor } from "../../utils/helpers/colors";
import { spacing } from "../../utils/helpers/tokens";
import EmptyState from "../ui/EmptyState";
import IsLoading from "../ui/IconLoading";
import PlaybackDateSheet from "./shared/PlaybackDateSheet";
import PlaybackSpeedSheet from "./shared/PlaybackSpeedSheet";
import PlaybackTimeline from "./shared/PlaybackTimeline";
import { useCameraViewToken } from "./shared/useCameraViewToken";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { buildCameraFullscreenHTML } from "./shared/cameraStreamHtml";
import {
  pauseCameraWebView,
  postCameraWebViewToken,
  resumeCameraWebView,
  startCameraWebView,
  stopCameraWebView,
} from "./shared/cameraWebViewMessaging";
import { GO2RTC_HOST } from "./shared/cameraStreamConfig";
import { getCameraHlsUrl } from "./shared/cameraStreamUtils";
import {
  addDays,
  buildPlaybackClipGroups,
  DEFAULT_PLAYBACK_SPEED,
  formatClock,
  formatElapsed,
  getPlaybackDateLabel,
  getPlaybackSpeedBadge,
  getScrubSecAtOffset,
  getTimelineOffsetForSec,
  getTotalClipCount,
  startOfDay,
  type PlaybackClip,
  type PlaybackClipGroup,
  type PlaybackSpeed,
} from "./shared/cameraPlaybackHelpers";
import {
  getPlaybackDayRange,
  getPlaybackRecordings,
  getPlaybackRecordingDays,
  getPlaybackWebSocketUrl,
  resolvePlaybackHlsUrl,
  startPlaybackSession,
  stopPlaybackSession,
  type PlaybackSession,
} from "../../services/data/playbackApi";
import { warn } from "../../utils/Logger";
import {
  PLAYER_ASPECT_RATIO,
  styles,
  TIMELINE_READING_OFFSET,
  TIMELINE_ROW_HEIGHT,
  TIMELINE_TOP_MARGIN,
} from "./CameraPlayback.styles";

/** Nút điều khiển trên video tự ẩn sau khoảng này; chạm vào cam để hiện lại. */
const CONTROLS_AUTO_HIDE_MS = 4000;
const PLAYBACK_START_RETRY_MS = 700;
const LIVE_RECORDINGS_REFRESH_MS = 30000;
/** Cuộn timeline quá mức này thì coi như đang tua, hiện nút xem trực tiếp. */
const LIVE_RETURN_SCROLL_THRESHOLD = 24;
const TIMELINE_SCALE_STEP = 0.25;
const TIMELINE_SCALE_MIN = 0.5;
const TIMELINE_SCALE_MAX = 2;
const ANDROID_LIVE_WATCHDOG_INTERVAL_MS = 6000;
const ANDROID_LIVE_STALE_AFTER_MS = 18000;
/**
 * Camera chết/mất mạng thì onError bắn liên tục. Giãn dần thời gian thử lại để
 * không remount player mỗi 2s vô hạn (tốn pin, tốn data), và sau vài lần liên
 * tiếp thì nói cho người dùng biết thay vì để spinner xoay mãi.
 */
const LIVE_RETRY_BASE_MS = 2000;
const LIVE_RETRY_MAX_MS = 15000;
const LIVE_ERROR_NOTICE_AFTER = 3;

const CameraPlayback: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const hairlineBorderColor = useHairlineBorderColor();
  const screenDims = useWindowDimensions();

  const { camera } = route.params ?? {};

  const [selectedDate, setSelectedDate] = React.useState(() =>
    startOfDay(new Date())
  );
  const [selectedStartTimeSec, setSelectedStartTimeSec] = React.useState<
    number | null
  >(null);
  const [pendingSeekSec, setPendingSeekSec] = React.useState<number | null>(
    null
  );
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [activeClipId, setActiveClipId] = React.useState<string | null>(null);
  const [openedGroupId, setOpenedGroupId] = React.useState<string | null>(null);
  // Một cờ tạm dừng duy nhất cho cả stream trực tiếp và tiến trình phát mô phỏng.
  const [isPaused, setIsPaused] = React.useState(false);
  // Bản ghi đã phát hết: nút play phải phát lại từ đầu chứ không chỉ bỏ pause
  // (player đã ở cuối stream nên bỏ pause không làm gì).
  const [isClipEnded, setIsClipEnded] = React.useState(false);
  const [positionSec, setPositionSec] = React.useState(0);
  const [speed, setSpeed] = React.useState<PlaybackSpeed>(
    DEFAULT_PLAYBACK_SPEED
  );
  const [isSpeedSheetVisible, setIsSpeedSheetVisible] = React.useState(false);
  const [isDateSheetVisible, setIsDateSheetVisible] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"timeline" | "grid">(
    "timeline"
  );
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [timelineScale, setTimelineScale] = React.useState(1);
  const [areControlsVisible, setAreControlsVisible] = React.useState(true);
  const [controlsNonce, setControlsNonce] = React.useState(0);
  const [timelineOffsetY, setTimelineOffsetY] = React.useState(0);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [isAppActive, setIsAppActive] = React.useState(true);
  const [liveNowMs, setLiveNowMs] = React.useState(() => Date.now());
  const [recordings, setRecordings] = React.useState<
    Array<{ startMs: number; endMs: number }>
  >([]);
  const [recordingDays, setRecordingDays] = React.useState<number[]>([]);
  const [isRecordingsLoading, setIsRecordingsLoading] = React.useState(true);
  const [recordingsError, setRecordingsError] = React.useState<string | null>(
    null
  );
  const [loadedRecordingsDayStartMs, setLoadedRecordingsDayStartMs] =
    React.useState<number | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [playbackSession, setPlaybackSession] =
    React.useState<PlaybackSession | null>(null);
  const [playbackError, setPlaybackError] = React.useState<string | null>(null);
  const [progressPreviewRatio, setProgressPreviewRatio] = React.useState<
    number | null
  >(null);
  const [liveVideoKey, setLiveVideoKey] = React.useState(0);
  const [networkReconnectNonce, setNetworkReconnectNonce] = React.useState(0);

  const liveWebViewRef = React.useRef<WebView>(null);
  const timelineScrollRef = React.useRef<ScrollView>(null);
  const viewOffsetsRef = React.useRef<Record<"timeline" | "grid", number>>({
    timeline: 0,
    grid: 0,
  });
  const sessionRef = React.useRef<PlaybackSession | null>(null);
  const playbackStartMsRef = React.useRef<number | null>(null);
  const currentPositionRef = React.useRef(0);
  const webSocketRef = React.useRef<WebSocket | null>(null);
  const pingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineSeekTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const liveRetryTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isTimelineDraggingRef = React.useRef(false);
  const timelineDragGenerationRef = React.useRef(0);
  const timelineMomentumGenerationRef = React.useRef<number | null>(null);
  const startRequestIdRef = React.useRef(0);
  const progressTrackWidthRef = React.useRef(0);
  const lastLiveProgressAtRef = React.useRef(Date.now());
  const liveErrorCountRef = React.useRef(0);
  const activeClipRef = React.useRef<PlaybackClip | null>(null);
  const reconnectIntentRef = React.useRef<
    | { mode: "live" }
    | { mode: "playback"; fromMs: number; endMs: number }
    | null
  >(null);

  // useCallback để listener AppState trong useCameraViewToken không phải
  // subscribe lại mỗi lần render.
  const handleAppActive = React.useCallback(() => setIsAppActive(true), []);
  const handleAppBackground = React.useCallback(
    () => setIsAppActive(false),
    []
  );

  const {
    cameraToken,
    clearTokenRefreshTimer,
    fetchCameraTokenRef,
    thumbTimestamp,
    tokenErrorMessage,
  } = useCameraViewToken({
    isFocused,
    onActive: handleAppActive,
    onBackground: handleAppBackground,
  });

  // useCameraViewToken không tự fetch khi mount — consumer phải kích hoạt khi
  // screen được focus (cùng pattern với CameraList/CameraListGrid).
  useFocusEffect(
    React.useCallback(() => {
      fetchCameraTokenRef.current?.(false);

      return () => {
        clearTokenRefreshTimer();
      };
    }, [clearTokenRefreshTimer, fetchCameraTokenRef])
  );

  // Suy ra từ đồng hồ live thay vì chốt lúc mount: nếu app mở qua nửa đêm thì
  // "hôm nay" phải đổi theo, nếu không mũi tên ngày sau vẫn bị chặn ở ngày cũ.
  // Vẫn là useMemo theo mốc ms nên identity chỉ đổi mỗi lần sang ngày mới.
  const todayMs = startOfDay(new Date(liveNowMs)).getTime();
  const today = React.useMemo(() => new Date(todayMs), [todayMs]);
  const { dayStartMs, dayEndMs } = React.useMemo(
    () => getPlaybackDayRange(selectedDate),
    [selectedDate]
  );
  const clipGroups = React.useMemo(
    () => buildPlaybackClipGroups(recordings, dayStartMs),
    [dayStartMs, recordings]
  );

  const activeGroup = React.useMemo(
    () => clipGroups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, clipGroups]
  );
  const activeClip = React.useMemo(
    () =>
      activeGroup?.clips.find((clip) => clip.id === activeClipId) ?? null,
    [activeClipId, activeGroup]
  );

  React.useEffect(() => {
    activeClipRef.current = activeClip;
  }, [activeClip]);

  const isScreenVisible = isFocused && isAppActive;

  React.useEffect(() => {
    if (!isScreenVisible || playbackSession) return;

    setLiveNowMs(Date.now());
    const timer = setInterval(() => setLiveNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isScreenVisible, playbackSession]);

  React.useEffect(() => {
    if (Platform.OS !== "ios") return;

    const webView = liveWebViewRef.current;
    if (playbackSession || !isScreenVisible) {
      stopCameraWebView(webView);
      return;
    }
    if (isPaused) {
      pauseCameraWebView(webView);
      return;
    }

    startCameraWebView(webView);
    resumeCameraWebView(webView);
  }, [isPaused, isScreenVisible, playbackSession]);

  React.useEffect(() => {
    if (Platform.OS !== "ios" || playbackSession || !cameraToken) return;
    postCameraWebViewToken(liveWebViewRef.current, cameraToken);
  }, [cameraToken, playbackSession]);

  const closePlaybackSocket = React.useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (webSocketRef.current) {
      webSocketRef.current.onclose = null;
      webSocketRef.current.onerror = null;
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
  }, []);

  const stopCurrentSession = React.useCallback(
    (resetPlayer = true) => {
      startRequestIdRef.current += 1;
      closePlaybackSocket();

      const currentSession = sessionRef.current;
      const wasPlayingBack =
        currentSession !== null || playbackStartMsRef.current !== null;
      sessionRef.current = null;
      if (currentSession)
        stopPlaybackSession(currentSession.sessionId).catch(() => {});

      if (resetPlayer) {
        setPlaybackSession(null);
        playbackStartMsRef.current = null;
        currentPositionRef.current = 0;
        setPositionSec(0);
        setProgressPreviewRatio(null);
        setIsClipEnded(false);
        if (wasPlayingBack) setIsVideoReady(false);
        setIsConnecting(false);
      }
    },
    [closePlaybackSocket]
  );

  const openPlaybackSocket = React.useCallback(
    (sessionId: string, playbackSpeed: PlaybackSpeed) => {
      closePlaybackSocket();

      try {
        const socket = new WebSocket(getPlaybackWebSocketUrl(sessionId));
        webSocketRef.current = socket;

        const sendPosition = () => {
          if (
            socket.readyState !== WebSocket.OPEN ||
            playbackStartMsRef.current === null
          )
            return;

          socket.send(
            String(
              Math.round(
                playbackStartMsRef.current +
                  currentPositionRef.current * 1000
              )
            )
          );
        };

        socket.onopen = () => {
          sendPosition();
          const positionIntervalMs =
            playbackSpeed >= 4 ? 500 : playbackSpeed >= 2 ? 1000 : 2000;
          pingTimerRef.current = setInterval(
            sendPosition,
            positionIntervalMs
          );
        };
        socket.onclose = () => {
          if (pingTimerRef.current) clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        };
        socket.onerror = socket.onclose;
      } catch (error) {
        warn("Playback WebSocket error:", error);
      }
    },
    [closePlaybackSocket]
  );

  // Chỉ reset lựa chọn/player khi đổi camera hoặc đổi ngày. Refresh token
  // (đặc biệt sau khi có mạng lại) không được xoá mốc playback đang xem.
  React.useEffect(() => {
    reconnectIntentRef.current = null;
    stopCurrentSession();
    setActiveGroupId(null);
    setActiveClipId(null);
    setOpenedGroupId(null);
    setIsPaused(false);
    setPlaybackError(null);
    setRecordingsError(null);
    setIsRecordingsLoading(true);
    setLoadedRecordingsDayStartMs(null);
    setTimelineOffsetY(0);
    viewOffsetsRef.current = { timeline: 0, grid: 0 };
    timelineScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [camera?.iD_Camera_Ma, dayStartMs, stopCurrentSession]);

  React.useEffect(() => {
    if (!cameraToken || !camera?.iD_Camera_Ma) return;

    let cancelled = false;
    setRecordingsError(null);
    setIsRecordingsLoading(true);

    getPlaybackRecordings(
      camera.iD_Camera_Ma,
      cameraToken,
      dayStartMs,
      dayEndMs
    )
      .then((nextRecordings) => {
        if (!cancelled) {
          setRecordings(nextRecordings);
          setLoadedRecordingsDayStartMs(dayStartMs);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRecordings([]);
        setLoadedRecordingsDayStartMs(dayStartMs);
        setRecordingsError(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách bản ghi."
        );
      })
      .finally(() => {
        if (!cancelled) setIsRecordingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    camera?.iD_Camera_Ma,
    cameraToken,
    dayEndMs,
    dayStartMs,
    networkReconnectNonce,
  ]);

  // Đoạn ghi hiện tại tiếp tục dài ra khi đang xem live. Tải lại nhẹ theo
  // chu kỳ để timeline nhận thêm segment mới mà không cần vào lại màn hình.
  React.useEffect(() => {
    if (
      !isScreenVisible ||
      playbackSession ||
      !cameraToken ||
      !camera?.iD_Camera_Ma ||
      selectedDate.getTime() !== today.getTime()
    )
      return;

    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const range = getPlaybackDayRange(selectedDate);
        const nextRecordings = await getPlaybackRecordings(
          camera.iD_Camera_Ma,
          cameraToken,
          range.dayStartMs,
          range.dayEndMs
        );
        if (!cancelled) setRecordings(nextRecordings);
      } catch {
        // Poll nền thất bại không thay dữ liệu/lỗi đang hiển thị.
      } finally {
        refreshing = false;
      }
    };

    const timer = setInterval(refresh, LIVE_RECORDINGS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    camera?.iD_Camera_Ma,
    cameraToken,
    isScreenVisible,
    playbackSession,
    selectedDate,
    today,
  ]);

  React.useEffect(
    () => () => {
      if (timelineSeekTimerRef.current)
        clearTimeout(timelineSeekTimerRef.current);
      if (liveRetryTimerRef.current)
        clearTimeout(liveRetryTimerRef.current);
      stopCurrentSession(false);
    },
    [stopCurrentSession]
  );

  /* ── Nút trên video: hiện vài giây rồi tự ẩn ─────────────────────── */
  // controlsNonce để gia hạn được timer ngay cả khi nút đang hiện: chỉ dựa vào
  // areControlsVisible thì set lại đúng giá trị cũ sẽ không chạy lại effect.
  React.useEffect(() => {
    if (!areControlsVisible) return;

    const timer = setTimeout(
      () => setAreControlsVisible(false),
      CONTROLS_AUTO_HIDE_MS
    );

    return () => clearTimeout(timer);
  }, [areControlsVisible, controlsNonce]);

  // Chạm vào khung hình để hiện lại; đang hiện thì chạm để ẩn luôn.
  const handleTogglePlayerControls = React.useCallback(() => {
    setAreControlsVisible((prev) => !prev);
    setControlsNonce((prev) => prev + 1);
  }, []);

  // Bấm một nút thì gia hạn thêm thời gian hiển thị.
  const keepControlsVisible = React.useCallback(() => {
    setAreControlsVisible(true);
    setControlsNonce((prev) => prev + 1);
  }, []);

  useFocusEffect(
    React.useCallback(
      () => () => {
        stopCurrentSession();
      },
      [stopCurrentSession]
    )
  );

  /* ── Toàn màn hình = khoá ngang ──────────────────────────────────── */
  React.useEffect(() => {
    if (!isFocused) return;

    return () => {
      Orientation.lockToPortrait();
      // Phải bỏ luôn cờ fullscreen: rời màn hình khi đang toàn màn hình rồi
      // quay lại sẽ có layout fullscreen trong khi máy đã về dọc.
      setIsFullscreen(false);
    };
  }, [isFocused]);

  // Android: nút back cứng phải thoát toàn màn hình trước, giống fullscreen của
  // CameraListGrid (nó nằm trong Modal nên có onRequestClose). Ở đây fullscreen
  // là layout inline, không có Modal, nên phải tự bắt back.
  React.useEffect(() => {
    if (Platform.OS !== "android" || !isFullscreen || !isFocused) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        Orientation.lockToPortrait();
        setIsFullscreen(false);
        return true;
      }
    );

    return () => subscription.remove();
  }, [isFocused, isFullscreen]);

  const toggleFullscreen = React.useCallback(() => {
    setIsFullscreen((prev) => {
      if (prev) {
        Orientation.lockToPortrait();
        return false;
      }

      Orientation.lockToLandscape();
      return true;
    });
  }, []);

  const startFrom = React.useCallback(
    async (fromMs: number, playbackEndMs = dayEndMs) => {
      if (!cameraToken || !camera?.iD_Camera_Ma) return;

      // Không chặn theo isConnecting: nếu server trả session mà player không
      // bao giờ phát onLoad/onError thì cờ đó treo mãi và mọi lần chọn bản ghi
      // sau đó bị bỏ qua. startRequestIdRef + stopCurrentSession đã đảm bảo
      // yêu cầu cũ bị vô hiệu và phiên cũ được dọn.
      stopCurrentSession();
      const requestId = ++startRequestIdRef.current;
      playbackStartMsRef.current = fromMs;
      currentPositionRef.current = 0;
      setPositionSec(0);
      setIsPaused(false);
      setIsClipEnded(false);
      setIsVideoReady(false);
      setPlaybackError(null);
      setIsConnecting(true);

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const nextSession = await startPlaybackSession(
            camera.iD_Camera_Ma,
            cameraToken,
            fromMs,
            playbackEndMs
          );

          if (requestId !== startRequestIdRef.current) {
            stopPlaybackSession(nextSession.sessionId).catch(() => {});
            return;
          }

          sessionRef.current = nextSession;
          setPlaybackSession(nextSession);
          openPlaybackSocket(nextSession.sessionId, speed);
          return;
        } catch (error) {
          if (attempt < 2) {
            await new Promise<void>((resolve) =>
              setTimeout(() => resolve(), PLAYBACK_START_RETRY_MS)
            );
            continue;
          }

          if (requestId !== startRequestIdRef.current) return;
          setPlaybackError(
            error instanceof Error
              ? error.message
              : "Không thể bắt đầu phát bản ghi."
          );
          setIsConnecting(false);
          setPlaybackSession(null);
          sessionRef.current = null;
        }
      }
    },
    [
      camera?.iD_Camera_Ma,
      cameraToken,
      dayEndMs,
      openPlaybackSocket,
      speed,
      stopCurrentSession,
    ]
  );

  const handleNetworkOffline = React.useCallback(() => {
    const playbackStartMs = playbackStartMsRef.current;
    if (playbackStartMs !== null) {
      const clipEndMs = activeClipRef.current?.endMs ?? dayEndMs;
      reconnectIntentRef.current = {
        mode: "playback",
        fromMs: Math.min(
          playbackStartMs + currentPositionRef.current * 1000,
          Math.max(playbackStartMs, clipEndMs - 1000)
        ),
        endMs: clipEndMs,
      };
    } else if (!reconnectIntentRef.current) {
      reconnectIntentRef.current = { mode: "live" };
    }

    stopCameraWebView(liveWebViewRef.current);
    stopCurrentSession();
    setIsVideoReady(false);
    setPlaybackError(null);
  }, [dayEndMs, stopCurrentSession]);

  const handleNetworkReconnect = React.useCallback(async () => {
    // Token hook cũng lắng nghe reconnect. Request bên trong hook được gộp nên
    // hai listener không tạo hai request token chạy song song.
    await fetchCameraTokenRef.current?.(true);
    setNetworkReconnectNonce((value) => value + 1);
  }, [fetchCameraTokenRef]);

  useNetworkAwareReload(handleNetworkReconnect, {
    enabled: isFocused,
    onOffline: handleNetworkOffline,
    // App resume đã được useCameraViewToken xử lý; tại đây chỉ phục hồi khi
    // trạng thái mạng thực sự chuyển từ offline sang online.
    refetchOnAppResume: false,
  });

  React.useEffect(() => {
    if (
      networkReconnectNonce === 0 ||
      !cameraToken ||
      !isScreenVisible
    )
      return;

    const intent = reconnectIntentRef.current;
    if (!intent) return;
    reconnectIntentRef.current = null;
    setPlaybackError(null);
    setIsVideoReady(false);

    if (intent.mode === "playback") {
      startFrom(intent.fromMs, intent.endMs).catch(() => {});
      return;
    }

    setIsConnecting(false);
    if (Platform.OS === "android") {
      lastLiveProgressAtRef.current = Date.now();
      // Có mạng lại là một lần thử "sạch": bỏ backoff đã tích từ lúc offline.
      liveErrorCountRef.current = 0;
      setLiveVideoKey((value) => value + 1);
      return;
    }

    postCameraWebViewToken(liveWebViewRef.current, cameraToken);
    startCameraWebView(liveWebViewRef.current);
    resumeCameraWebView(liveWebViewRef.current);
  }, [
    cameraToken,
    isScreenVisible,
    networkReconnectNonce,
    startFrom,
  ]);

  React.useEffect(() => {
    if (
      Platform.OS !== "android" ||
      !isScreenVisible ||
      !cameraToken ||
      playbackSession ||
      isPaused
    )
      return;

    lastLiveProgressAtRef.current = Date.now();
    const watchdog = setInterval(() => {
      if (
        Date.now() - lastLiveProgressAtRef.current <
        ANDROID_LIVE_STALE_AFTER_MS
      )
        return;

      lastLiveProgressAtRef.current = Date.now();
      setIsVideoReady(false);
      setPlaybackError(null);
      setLiveVideoKey((value) => value + 1);
    }, ANDROID_LIVE_WATCHDOG_INTERVAL_MS);

    return () => clearInterval(watchdog);
  }, [
    cameraToken,
    isPaused,
    isScreenVisible,
    liveVideoKey,
    playbackSession,
  ]);

  const handleSelectGroup = React.useCallback(
    (group: PlaybackClipGroup, clipId?: string) => {
      const clip =
        group.clips.find((item) => item.id === clipId) ?? group.clips[0];
      if (!clip) return;

      // Card/group và vạch đọc phải cùng trỏ vào một mốc. Trước đây thao tác
      // này chỉ đổi session phát nên badge chạy đúng giờ nhưng danh sách vẫn
      // nằm tại offset cũ.
      const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
      const rawTimelineOffset = getTimelineOffsetForSec(
        clipGroups,
        clip.startSec,
        rowHeight
      );
      const scrollOffset = Math.max(
        0,
        rawTimelineOffset - TIMELINE_READING_OFFSET + TIMELINE_TOP_MARGIN
      );

      if (timelineSeekTimerRef.current) {
        clearTimeout(timelineSeekTimerRef.current);
        timelineSeekTimerRef.current = null;
      }
      timelineDragGenerationRef.current += 1;
      timelineMomentumGenerationRef.current = null;
      isTimelineDraggingRef.current = false;
      viewOffsetsRef.current.timeline = scrollOffset;
      if (viewMode === "timeline") setTimelineOffsetY(scrollOffset);

      setActiveGroupId(group.id);
      setActiveClipId(clip.id);
      setOpenedGroupId(null);
      reconnectIntentRef.current = null;
      startFrom(clip.startMs, clip.endMs).catch(() => {});

      if (viewMode === "timeline") {
        requestAnimationFrame(() => {
          timelineScrollRef.current?.scrollTo({
            y: scrollOffset,
            animated: true,
          });
        });
      }
    },
    [clipGroups, startFrom, timelineScale, viewMode]
  );

  const getProgressRatioFromEvent = React.useCallback(
    (event: GestureResponderEvent) => {
      const width = progressTrackWidthRef.current;
      if (width <= 0) return 0;
      return Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
    },
    []
  );

  const handleProgressSeekMove = React.useCallback(
    (event: GestureResponderEvent) => {
      setProgressPreviewRatio(getProgressRatioFromEvent(event));
    },
    [getProgressRatioFromEvent]
  );

  const handleProgressSeekRelease = React.useCallback(
    (event: GestureResponderEvent) => {
      const ratio = getProgressRatioFromEvent(event);
      setProgressPreviewRatio(null);
      if (!activeClip || !playbackSession) return;

      // Không seek đúng endMs vì đó là biên ngoài của đoạn ghi.
      const seekableDurationMs = Math.max(
        0,
        activeClip.endMs - activeClip.startMs - 1000
      );
      const targetMs =
        activeClip.startMs + Math.round(seekableDurationMs * ratio);
      startFrom(targetMs, activeClip.endMs).catch(() => {});
      keepControlsVisible();
    },
    [
      activeClip,
      getProgressRatioFromEvent,
      keepControlsVisible,
      playbackSession,
      startFrom,
    ]
  );

  // Thoát chế độ tua: bỏ bản ghi đang chọn, đưa timeline về mốc mới nhất và
  // cho stream chạy lại.
  const handleBackToLive = React.useCallback(() => {
    // Hủy seek đang chờ từ onScrollEndDrag/onMomentumScrollEnd. Nếu không,
    // callback cuộn có thể chạy sau thao tác này và tạo lại playback session.
    if (timelineSeekTimerRef.current) {
      clearTimeout(timelineSeekTimerRef.current);
      timelineSeekTimerRef.current = null;
    }
    timelineDragGenerationRef.current += 1;
    timelineMomentumGenerationRef.current = null;
    isTimelineDraggingRef.current = false;
    reconnectIntentRef.current = null;

    stopCurrentSession();
    setActiveGroupId(null);
    setActiveClipId(null);
    setOpenedGroupId(null);
    setPositionSec(0);
    setIsPaused(false);
    setIsConnecting(false);
    setPlaybackError(null);
    setTimelineOffsetY(0);
    viewOffsetsRef.current.timeline = 0;
    timelineScrollRef.current?.scrollTo({ y: 0, animated: true });
    keepControlsVisible();
  }, [keepControlsVisible, stopCurrentSession]);

  const handleTogglePause = React.useCallback(() => {
    // Đã phát hết bản ghi: bấm play là phát lại clip từ đầu.
    if (isClipEnded && activeClip) {
      startFrom(activeClip.startMs, activeClip.endMs).catch(() => {});
      return;
    }

    setIsPaused((prev) => !prev);
  }, [activeClip, isClipEnded, startFrom]);

  const handleSelectSpeed = React.useCallback(
    (nextSpeed: PlaybackSpeed) => {
      setSpeed(nextSpeed);
      setIsSpeedSheetVisible(false);

      const currentSession = sessionRef.current;
      if (currentSession)
        openPlaybackSocket(currentSession.sessionId, nextSpeed);
    },
    [openPlaybackSocket]
  );

  const handleChangeDate = React.useCallback((amount: number) => {
    // Giờ bắt đầu chỉ thuộc về ngày đã chọn trong lịch; đổi ngày bằng mũi tên
    // thì bỏ nó đi, nếu không sheet lịch mở lại vẫn hiện giờ cũ của ngày khác.
    setSelectedStartTimeSec(null);
    setSelectedDate((prev) => {
      const next = startOfDay(addDays(prev, amount));
      // Không cho chọn ngày ở tương lai.
      return next.getTime() > startOfDay(new Date()).getTime() ? prev : next;
    });
  }, []);

  const handleConfirmDate = React.useCallback(
    (date: Date, startTimeSec: number | null) => {
      setSelectedDate(startOfDay(date));
      setSelectedStartTimeSec(startTimeSec);
      setIsDateSheetVisible(false);
      setOpenedGroupId(null);

      if (startTimeSec === null) {
        setTimelineOffsetY(0);
        viewOffsetsRef.current = { timeline: 0, grid: 0 };
        timelineScrollRef.current?.scrollTo({ y: 0, animated: false });
        return;
      }

      setPendingSeekSec(startTimeSec);
    },
    []
  );

  const loadRecordingDays = React.useCallback(
    async (month: Date) => {
      if (!cameraToken || !camera?.iD_Camera_Ma) return;

      const days = await getPlaybackRecordingDays(
        camera.iD_Camera_Ma,
        cameraToken,
        month.getFullYear(),
        month.getMonth() + 1
      );
      setRecordingDays(days);
    },
    [camera?.iD_Camera_Ma, cameraToken]
  );

  const handleOpenDateSheet = React.useCallback(() => {
    setIsDateSheetVisible(true);
    loadRecordingDays(selectedDate).catch(() => {});
  }, [loadRecordingDays, selectedDate]);

  const handleToggleViewMode = React.useCallback(() => {
    const nextMode = viewMode === "timeline" ? "grid" : "timeline";
    const nextOffset = viewOffsetsRef.current[nextMode];

    viewOffsetsRef.current[viewMode] = timelineOffsetY;
    setViewMode(nextMode);
    setOpenedGroupId(null);
    setTimelineOffsetY(nextOffset);

    requestAnimationFrame(() => {
      timelineScrollRef.current?.scrollTo({
        y: nextOffset,
        animated: false,
      });
    });
  }, [timelineOffsetY, viewMode]);

  const handleOpenGroup = React.useCallback(
    (group: PlaybackClipGroup) => {
      setOpenedGroupId(group.id);
    },
    []
  );

  const handleCloseGroup = React.useCallback(() => {
    setOpenedGroupId(null);
  }, []);

  const handleTimelineScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextOffset = event.nativeEvent.contentOffset.y;
      setTimelineOffsetY(nextOffset);

      viewOffsetsRef.current[viewMode] = nextOffset;
    },
    [viewMode]
  );

  const findClipAtMs = React.useCallback(
    (targetMs: number): { clip: PlaybackClip; group: PlaybackClipGroup } | null => {
      for (const group of clipGroups) {
        const clip = group.clips.find(
          (item) => targetMs >= item.startMs && targetMs <= item.endMs
        );
        if (clip) return { clip, group };
      }
      return null;
    },
    [clipGroups]
  );

  const commitTimelineSeek = React.useCallback(
    (offsetY: number) => {
      if (viewMode !== "timeline" || clipGroups.length === 0) return;

      const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
      const targetSec = getScrubSecAtOffset(
        clipGroups,
        offsetY + TIMELINE_READING_OFFSET - TIMELINE_TOP_MARGIN,
        rowHeight
      );
      if (targetSec === null) return;

      const targetMs = dayStartMs + targetSec * 1000;
      const target = findClipAtMs(targetMs);

      if (!target) {
        setPlaybackError("Không có bản ghi tại thời điểm này.");
        return;
      }

      setPlaybackError(null);
      setActiveGroupId(target.group.id);
      setActiveClipId(target.clip.id);
      setOpenedGroupId(null);
      startFrom(
        Math.max(
          target.clip.startMs,
          Math.min(targetMs, target.clip.endMs - 1000)
        ),
        target.clip.endMs
      ).catch(() => {});
      keepControlsVisible();
    },
    [
      clipGroups,
      dayStartMs,
      findClipAtMs,
      keepControlsVisible,
      startFrom,
      timelineScale,
      viewMode,
    ]
  );

  const handleTimelineScrollBeginDrag = React.useCallback(() => {
    timelineDragGenerationRef.current += 1;
    timelineMomentumGenerationRef.current = null;
    isTimelineDraggingRef.current = true;
    if (timelineSeekTimerRef.current) {
      clearTimeout(timelineSeekTimerRef.current);
      timelineSeekTimerRef.current = null;
    }
  }, []);

  const handleTimelineScrollEndDrag = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const dragGeneration = timelineDragGenerationRef.current;

      // Nếu không có momentum, RN không phát onMomentumScrollEnd. Chờ ngắn
      // để onMomentumScrollBegin có cơ hội hủy timer này.
      timelineSeekTimerRef.current = setTimeout(() => {
        timelineSeekTimerRef.current = null;
        if (timelineDragGenerationRef.current !== dragGeneration) return;
        if (!isTimelineDraggingRef.current) return;
        isTimelineDraggingRef.current = false;
        commitTimelineSeek(offsetY);
      }, 120);
    },
    [commitTimelineSeek]
  );

  const handleTimelineMomentumBegin = React.useCallback(() => {
    timelineMomentumGenerationRef.current =
      timelineDragGenerationRef.current;
    if (timelineSeekTimerRef.current) {
      clearTimeout(timelineSeekTimerRef.current);
      timelineSeekTimerRef.current = null;
    }
  }, []);

  const handleTimelineMomentumEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const momentumGeneration = timelineMomentumGenerationRef.current;
      timelineMomentumGenerationRef.current = null;
      if (
        momentumGeneration === null ||
        momentumGeneration !== timelineDragGenerationRef.current
      )
        return;
      if (!isTimelineDraggingRef.current) return;
      isTimelineDraggingRef.current = false;
      commitTimelineSeek(event.nativeEvent.contentOffset.y);
    },
    [commitTimelineSeek]
  );

  const handleZoom = React.useCallback((amount: number) => {
    setTimelineScale((prev) =>
      Math.min(TIMELINE_SCALE_MAX, Math.max(TIMELINE_SCALE_MIN, prev + amount))
    );
  }, []);

  React.useEffect(() => {
    if (
      pendingSeekSec === null ||
      loadedRecordingsDayStartMs !== dayStartMs
    )
      return;

    if (clipGroups.length === 0) {
      setPendingSeekSec(null);
      setPlaybackError("Ngày này không có bản ghi.");
      return;
    }

    const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
    const rawTimelineOffset = getTimelineOffsetForSec(
      clipGroups,
      pendingSeekSec,
      rowHeight
    );
    const scrollOffset = Math.max(
      0,
      rawTimelineOffset - TIMELINE_READING_OFFSET + TIMELINE_TOP_MARGIN
    );
    const targetMs = dayStartMs + pendingSeekSec * 1000;
    const target = findClipAtMs(targetMs);

    setViewMode("timeline");
    setTimelineOffsetY(scrollOffset);
    viewOffsetsRef.current.timeline = scrollOffset;
    setPendingSeekSec(null);

    if (target) {
      setActiveGroupId(target.group.id);
      setActiveClipId(target.clip.id);
      startFrom(
        Math.max(
          target.clip.startMs,
          Math.min(targetMs, target.clip.endMs - 1000)
        ),
        target.clip.endMs
      ).catch(() => {});
    } else {
      setPlaybackError("Không có bản ghi tại thời điểm này.");
    }

    requestAnimationFrame(() => {
      timelineScrollRef.current?.scrollTo({
        y: scrollOffset,
        animated: true,
      });
    });
  }, [
    clipGroups,
    dayStartMs,
    findClipAtMs,
    loadedRecordingsDayStartMs,
    pendingSeekSec,
    startFrom,
    timelineScale,
  ]);

  if (!camera) {
    return (
      <View style={styles.root}>
        <EmptyState
          iconName="videocam-off-outline"
          title="Không có camera"
          subtitle="Vui lòng chọn một camera trước khi xem lại bản ghi."
        />
      </View>
    );
  }

  if (tokenErrorMessage) {
    return (
      <View style={styles.root}>
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Camera"
          subtitle={tokenErrorMessage}
        />
      </View>
    );
  }

  // Chỉ dùng cho chế độ dọc; toàn màn hình đã để flex chiếm hết.
  const playerHeight = Math.round(screenDims.width / PLAYER_ASPECT_RATIO);
  // Bottom sheet group bắt đầu sát dưới player để không che progress/loading.
  const groupSheetHeight = Math.max(
    320,
    screenDims.height - insets.top - playerHeight
  );
  const timelineRowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
  // Thời gian tại vạch đọc — cuộn xuống thì lùi dần về quá khứ.
  const scrubSec = getScrubSecAtOffset(
    clipGroups,
    timelineOffsetY + TIMELINE_READING_OFFSET - TIMELINE_TOP_MARGIN,
    timelineRowHeight
  );
  // Đang tua khi đã chọn một bản ghi, hoặc đã cuộn timeline rời khỏi mốc mới nhất.
  const isSeeking =
    Boolean(activeGroup) ||
    (viewMode === "timeline" &&
      timelineOffsetY > LIVE_RETURN_SCROLL_THRESHOLD);
  const isSelectedToday = selectedDate.getTime() === today.getTime();
  const playbackClockSec =
    playbackSession && playbackStartMsRef.current !== null
      ? (playbackStartMsRef.current - dayStartMs) / 1000 + positionSec
      : null;
  const liveClockSec = Math.max(0, (liveNowMs - dayStartMs) / 1000);
  const displayedTimelineSec =
    playbackClockSec ??
    (!isSeeking && isSelectedToday ? liveClockSec : scrubSec);
  // Tạm dừng thì mở đầy đủ điều khiển + thanh tiến trình như app tham chiếu.
  const showPlaybackControls = Boolean(activeClip && playbackSession);
  const playbackOffsetSec =
    activeClip && playbackStartMsRef.current !== null
      ? Math.max(0, (playbackStartMsRef.current - activeClip.startMs) / 1000)
      : 0;
  const progressRatio = activeClip
    ? Math.min(1, (playbackOffsetSec + positionSec) / activeClip.durationSec)
    : 0;
  const visualProgressRatio = progressPreviewRatio ?? progressRatio;
  const cameraTitle = camera.iD_Camera_MoTa || camera.iD_Camera_Ma || "Camera";

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000"
        hidden={isFullscreen}
      />

      <View
        style={[
          styles.player,
          isFullscreen ? styles.playerFrameFill : { paddingTop: insets.top },
        ]}
      >
        {/* Toàn màn hình thì để flex chiếm hết như fsVideoArea của
            CameraListGrid, thay vì gán chiều cao cứng theo screenDims — tránh
            lệch khung trong lúc xoay máy. */}
        <View
          style={[
            styles.playerFrame,
            isFullscreen ? styles.playerFrameFill : { height: playerHeight },
          ]}
        >
          {!cameraToken ? null : playbackSession ? (
            <Video
              key={`playback-${playbackSession.sessionId}`}
              source={{ uri: resolvePlaybackHlsUrl(playbackSession.hlsUrl) }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              muted
              paused={!isScreenVisible || isPaused || isConnecting}
              rate={speed}
              repeat={false}
              controls={false}
              disableFocus
              useTextureView
              hideShutterView
              automaticallyWaitsToMinimizeStalling
              preferredForwardBufferDuration={30}
              bufferConfig={{
                minBufferMs: 10000,
                maxBufferMs: 120000,
                bufferForPlaybackMs: 2000,
                bufferForPlaybackAfterRebufferMs: 5000,
                backBufferDurationMs: 90000,
              }}
              onLoad={() => {
                if (
                  sessionRef.current?.sessionId !==
                  playbackSession.sessionId
                )
                  return;
                setIsVideoReady(true);
                setIsConnecting(false);
              }}
              onReadyForDisplay={() => {
                if (
                  sessionRef.current?.sessionId ===
                  playbackSession.sessionId
                )
                  setIsVideoReady(true);
              }}
              onProgress={({ currentTime }) => {
                if (
                  sessionRef.current?.sessionId !==
                  playbackSession.sessionId
                )
                  return;
                currentPositionRef.current = currentTime;
                setPositionSec(currentTime);
              }}
              onEnd={() => {
                if (
                  sessionRef.current?.sessionId !==
                  playbackSession.sessionId
                )
                  return;
                setIsPaused(true);
                setIsClipEnded(true);
              }}
              onError={(error) => {
                if (
                  sessionRef.current?.sessionId !==
                  playbackSession.sessionId
                )
                  return;
                warn("Playback video error:", error);
                if (playbackStartMsRef.current !== null) {
                  reconnectIntentRef.current = {
                    mode: "playback",
                    fromMs:
                      playbackStartMsRef.current +
                      currentPositionRef.current * 1000,
                    endMs: activeClipRef.current?.endMs ?? dayEndMs,
                  };
                }
                stopCurrentSession();
                setIsConnecting(false);
                setPlaybackError("Không thể phát bản ghi.");
              }}
            />
          ) : Platform.OS === "android" ? (
            <Video
              key={`live-${camera.iD_Camera}-${liveVideoKey}`}
              source={{
                uri: getCameraHlsUrl(camera.iD_Camera_Ma),
                headers: { Authorization: `Bearer ${cameraToken}` },
              }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              muted
              paused={!isScreenVisible || isPaused}
              rate={1}
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
                backBufferDurationMs: 0,
              }}
              onLoad={() => {
                lastLiveProgressAtRef.current = Date.now();
                liveErrorCountRef.current = 0;
                if (liveRetryTimerRef.current) {
                  clearTimeout(liveRetryTimerRef.current);
                  liveRetryTimerRef.current = null;
                }
                setIsVideoReady(true);
                setPlaybackError(null);
              }}
              onReadyForDisplay={() => {
                lastLiveProgressAtRef.current = Date.now();
                liveErrorCountRef.current = 0;
                setIsVideoReady(true);
                setPlaybackError(null);
              }}
              onProgress={() => {
                lastLiveProgressAtRef.current = Date.now();
              }}
              onError={(error) => {
                warn("Live video error:", error);
                const attempt = (liveErrorCountRef.current += 1);
                setIsVideoReady(false);
                setPlaybackError(
                  attempt >= LIVE_ERROR_NOTICE_AFTER
                    ? "Không thể phát camera trực tiếp. Đang thử lại..."
                    : null
                );

                if (liveRetryTimerRef.current)
                  clearTimeout(liveRetryTimerRef.current);
                liveRetryTimerRef.current = setTimeout(
                  () => {
                    liveRetryTimerRef.current = null;
                    lastLiveProgressAtRef.current = Date.now();
                    setLiveVideoKey((value) => value + 1);
                  },
                  Math.min(
                    LIVE_RETRY_MAX_MS,
                    LIVE_RETRY_BASE_MS * 2 ** (attempt - 1)
                  )
                );
              }}
            />
          ) : (
            <WebView
              ref={liveWebViewRef}
              key={`live-${camera.iD_Camera}-${cameraToken}`}
              source={{
                html: buildCameraFullscreenHTML(camera.iD_Camera_Ma),
                baseUrl: GO2RTC_HOST,
              }}
              style={StyleSheet.absoluteFill}
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
                postCameraWebViewToken(liveWebViewRef.current, cameraToken);
                startCameraWebView(liveWebViewRef.current);
              }}
              onMessage={(event) => {
                const message = event.nativeEvent.data;
                if (message === "ready") {
                  setIsVideoReady(true);
                  setPlaybackError(null);
                  return;
                }
                if (message === "token_expired") {
                  fetchCameraTokenRef.current?.(true);
                  return;
                }
                if (message === "close_fullscreen" && isFullscreen) {
                  toggleFullscreen();
                }
              }}
            />
          )}

          {!cameraToken || isConnecting || !isVideoReady ? (
            // pointerEvents none: lớp loading phủ kín khung hình, nếu ăn chạm
            // thì trong lúc chờ kết nối không bấm/hiện lại được nút nào.
            <View style={styles.playerLoading} pointerEvents="none">
              <IsLoading size="small" />
            </View>
          ) : null}

          {/* Chạm vào khung hình để hiện/ẩn nút. Đặt dưới các nút (khai báo
              trước) nên không chặn thao tác bấm nút. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTogglePlayerControls}
          />

          {areControlsVisible ? (
            <>
              {/* Vệt tối trên/dưới: nút trắng vẫn rõ khi cảnh camera sáng. */}
              <LinearGradient
                colors={["rgba(0,0,0,0.55)", "transparent"]}
                style={styles.playerScrimTop}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.6)"]}
                style={styles.playerScrimBottom}
                pointerEvents="none"
              />
            </>
          ) : null}

          {areControlsVisible ? (
            <View
              style={[
                styles.playerTopBar,
                isFullscreen && styles.playerTopBarFullscreen,
              ]}
            >
              <TouchableOpacity
                style={styles.playerBackBtn}
                onPress={() =>
                  isFullscreen ? toggleFullscreen() : navigation.goBack()
                }
                hitSlop={10}
                accessibilityLabel={`Quay lại — ${cameraTitle}`}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>

              <View style={styles.playerTopSpacer} />

              {/* Nhãn trạng thái: đang xem trực tiếp hay đang xem lại. Chỉ
                  mốc giờ, không kèm tên camera — OSD của đầu ghi thường in
                  chữ ở góc trên-trái khung hình. */}
              <View style={styles.statusChip}>
                <View
                  style={[
                    styles.statusChipDot,
                    isSeeking && styles.statusChipDotIdle,
                  ]}
                />
                <Text style={styles.statusChipText} allowFontScaling={false}>
                  {isSeeking
                    ? displayedTimelineSec === null
                      ? "XEM LẠI"
                      : formatClock(displayedTimelineSec)
                    : "TRỰC TIẾP"}
                </Text>
              </View>
            </View>
          ) : null}

          {areControlsVisible ? (
            <View
              style={[
                styles.playerControls,
                isFullscreen && styles.playerControlsFullscreen,
              ]}
            >
              <View style={styles.playerControlGroup}>
                <TouchableOpacity
                  style={styles.playerControlBtn}
                  onPress={() => {
                    keepControlsVisible();
                    handleTogglePause();
                  }}
                  hitSlop={8}
                  accessibilityLabel={
                    isClipEnded ? "Phát lại" : isPaused ? "Phát" : "Tạm dừng"
                  }
                >
                  <Ionicons
                    name={
                      isClipEnded ? "refresh" : isPaused ? "play" : "pause"
                    }
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>

                {showPlaybackControls && activeClip ? (
                  <Text style={styles.playerClock} allowFontScaling={false}>
                    {`${formatElapsed(
                      playbackOffsetSec + positionSec
                    )} / ${formatElapsed(activeClip.durationSec)}`}
                  </Text>
                ) : null}
              </View>

              <View style={styles.playerControlSpacer} />

              <View style={styles.playerControlGroup}>
                {/* Tốc độ chỉ có nghĩa khi đang phát bản ghi. */}
                {showPlaybackControls ? (
                  <TouchableOpacity
                    style={[styles.playerControlBtn, styles.playerSpeedBtn]}
                    onPress={() => {
                      keepControlsVisible();
                      setIsSpeedSheetVisible(true);
                    }}
                    hitSlop={8}
                    accessibilityLabel="Tốc độ phát"
                  >
                    <Text
                      style={styles.playerSpeedText}
                      allowFontScaling={false}
                    >
                      {getPlaybackSpeedBadge(speed)}
                    </Text>
                    <MaterialCommunityIcons
                      name="fast-forward-outline"
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.playerControlBtn}
                  onPress={toggleFullscreen}
                  hitSlop={8}
                  accessibilityLabel="Toàn màn hình"
                >
                  <MaterialCommunityIcons
                    name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {showPlaybackControls ? (
            <View
              style={styles.progressScrubber}
              onLayout={(event) => {
                progressTrackWidthRef.current =
                  event.nativeEvent.layout.width;
              }}
              onStartShouldSetResponder={() =>
                Boolean(activeClip && playbackSession && !isConnecting)
              }
              onMoveShouldSetResponder={() =>
                Boolean(activeClip && playbackSession && !isConnecting)
              }
              onResponderGrant={handleProgressSeekMove}
              onResponderMove={handleProgressSeekMove}
              onResponderRelease={handleProgressSeekRelease}
              onResponderTerminate={() => setProgressPreviewRatio(null)}
              accessibilityLabel="Tua vị trí phát"
            >
              <View style={styles.progressTrackWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${visualProgressRatio * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.progressHandle,
                      // Núm to hơn trong lúc kéo để thấy rõ đang tua.
                      progressPreviewRatio !== null &&
                        styles.progressHandleActive,
                      { left: `${visualProgressRatio * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {isFullscreen ? null : (
        <>
          <View style={styles.headerRow}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {cameraTitle}
            </Text>
            {clipGroups.length > 0 ? (
              <Text style={styles.headerMeta} allowFontScaling={false}>
                {`${getTotalClipCount(clipGroups)} bản ghi`}
              </Text>
            ) : null}
          </View>

          {/* Ghim cố định, không cuộn cùng timeline. */}
          <View style={styles.dateRow}>
            <View style={styles.datePill}>
              <TouchableOpacity
                style={styles.datePillBtn}
                onPress={() => handleChangeDate(-1)}
                hitSlop={8}
                accessibilityLabel="Ngày trước"
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePillCenter}
                onPress={handleOpenDateSheet}
                activeOpacity={0.7}
                accessibilityLabel="Mở lịch chọn ngày"
              >
                <Text style={styles.datePillText} allowFontScaling={false}>
                  {getPlaybackDateLabel(selectedDate, today)}
                </Text>
                <Ionicons name="funnel-outline" size={14} color={C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePillBtn,
                  isSelectedToday && styles.datePillBtnDisabled,
                ]}
                onPress={() => handleChangeDate(1)}
                disabled={isSelectedToday}
                hitSlop={8}
                accessibilityLabel="Ngày sau"
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.dateViewBtn,
                viewMode === "grid" && styles.dateViewBtnActive,
              ]}
              onPress={handleToggleViewMode}
              accessibilityLabel={
                viewMode === "timeline"
                  ? "Xem bản ghi dạng lưới"
                  : "Xem bản ghi dạng timeline"
              }
            >
              <MaterialCommunityIcons
                name={
                  viewMode === "timeline"
                    ? "view-grid-outline"
                    : "timeline-outline"
                }
                size={22}
                color={viewMode === "grid" ? C.red : C.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {playbackError ? (
            <View style={styles.playbackStatus}>
              <Ionicons name="alert-circle-outline" size={18} color={C.red} />
              <Text style={styles.playbackStatusText}>{playbackError}</Text>
            </View>
          ) : null}

          {/* Bọc riêng vùng cuộn để nút zoom canh giữa theo đúng vùng này,
              không tính cả chiều cao player. */}
          <View style={styles.scrollArea}>
            <ScrollView
              ref={timelineScrollRef}
              contentContainerStyle={[
                styles.scrollContent,
                // Không còn thanh chức năng ở đáy nên timeline tự chừa safe area.
                { paddingBottom: insets.bottom + spacing.lg },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={handleTimelineScroll}
              onScrollBeginDrag={handleTimelineScrollBeginDrag}
              onScrollEndDrag={handleTimelineScrollEndDrag}
              onMomentumScrollBegin={handleTimelineMomentumBegin}
              onMomentumScrollEnd={handleTimelineMomentumEnd}
              scrollEventThrottle={16}
            >
              <PlaybackTimeline
                activeClipId={activeClipId}
                activeGroupId={activeGroupId}
                cameraCode={camera.iD_Camera_Ma}
                cameraId={camera.iD_Camera}
                cameraToken={cameraToken}
                emptySubtitle={
                  "Chưa có bản ghi nào trong ngày đã chọn."
                }
                errorMessage={recordingsError}
                groups={clipGroups}
                groupSheetHeight={groupSheetHeight}
                onCloseGroup={handleCloseGroup}
                onOpenGroup={handleOpenGroup}
                onSelectGroup={handleSelectGroup}
                openedGroupId={openedGroupId}
                isLoading={isRecordingsLoading}
                scale={timelineScale}
                thumbTimestamp={thumbTimestamp}
                viewMode={viewMode}
              />
            </ScrollView>

            {viewMode !== "timeline" || displayedTimelineSec === null ? null : (
              <>
                <View style={styles.scrubLine} pointerEvents="none" />
                <View style={styles.scrubBadgeWrap} pointerEvents="none">
                  <View style={styles.scrubBadge}>
                    <Text
                      style={styles.scrubBadgeText}
                      allowFontScaling={false}
                      numberOfLines={1}
                    >
                      {formatClock(displayedTimelineSec)}
                    </Text>
                    <View style={styles.scrubBadgeArrow} />
                  </View>
                </View>
              </>
            )}

            {viewMode === "timeline" && clipGroups.length > 0 ? (
              <View
                style={[
                  styles.zoomColumn,
                  {
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: hairlineBorderColor,
                  },
                ]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  style={[
                    styles.zoomBtn,
                    timelineScale >= TIMELINE_SCALE_MAX &&
                      styles.zoomBtnDisabled,
                  ]}
                  onPress={() => handleZoom(TIMELINE_SCALE_STEP)}
                  disabled={timelineScale >= TIMELINE_SCALE_MAX}
                  accessibilityLabel="Giãn timeline"
                >
                  <Ionicons name="add" size={22} color={C.textSecondary} />
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={[
                    styles.zoomBtn,
                    timelineScale <= TIMELINE_SCALE_MIN &&
                      styles.zoomBtnDisabled,
                  ]}
                  onPress={() => handleZoom(-TIMELINE_SCALE_STEP)}
                  disabled={timelineScale <= TIMELINE_SCALE_MIN}
                  accessibilityLabel="Thu timeline"
                >
                  <Ionicons name="remove" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}

            {isSeeking ? (
              <View
                style={[
                  styles.liveButtonWrap,
                  { bottom: insets.bottom + spacing.lg },
                ]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  style={styles.liveButton}
                  onPress={handleBackToLive}
                  activeOpacity={0.85}
                  accessibilityLabel="Quay lại xem trực tiếp"
                >
                  <Ionicons name="play-circle" size={20} color={C.onBrand} />
                  <Text style={styles.liveButtonText} allowFontScaling={false}>
                    Xem trực tiếp
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </>
      )}

      <PlaybackSpeedSheet
        visible={isSpeedSheetVisible}
        selectedSpeed={speed}
        onSelect={handleSelectSpeed}
        onClose={() => setIsSpeedSheetVisible(false)}
      />
      <PlaybackDateSheet
        visible={isDateSheetVisible}
        selectedDate={selectedDate}
        selectedStartTimeSec={selectedStartTimeSec}
        today={today}
        recordingDays={recordingDays}
        onVisibleMonthChange={loadRecordingDays}
        onConfirm={handleConfirmDate}
        onClose={() => setIsDateSheetVisible(false)}
      />
    </View>
  );
};

export default CameraPlayback;
