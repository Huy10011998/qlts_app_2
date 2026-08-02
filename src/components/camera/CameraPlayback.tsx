import React from "react";
import {
  Animated,
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
import Video, { type VideoRef } from "react-native-video";
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
import {
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { spacing } from "../../utils/helpers/tokens";
import EmptyState from "../ui/EmptyState";
import IsLoading from "../ui/IconLoading";
import PlaybackDateSheet from "./shared/PlaybackDateSheet";
import PlaybackSpeedSheet from "./shared/PlaybackSpeedSheet";
import PlaybackTimeline from "./shared/PlaybackTimeline";
import CameraStatusChip from "./shared/CameraStatusChip";
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
import {
  ANDROID_LIVE_ERROR_NOTICE_AFTER,
  ANDROID_LIVE_RETRY_BASE_MS,
  ANDROID_LIVE_RETRY_MAX_MS,
  ANDROID_LIVE_STALE_AFTER_MS,
  ANDROID_LIVE_WATCHDOG_INTERVAL_MS,
  GO2RTC_HOST,
} from "./shared/cameraStreamConfig";
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
  makeStyles,
  PLAYER_ASPECT_RATIO,
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
/**
 * Nhịp báo tiến trình của player. Mặc định 250ms làm badge nhảy từng nấc; 200ms
 * đủ mượt cho badge (chỉ hiện tới giây) và cho timeline bám theo — timeline trôi
 * ~0.05px/giây nên dày hơn nữa không thấy khác, chỉ tốn render.
 */
const PLAYBACK_PROGRESS_INTERVAL_MS = 200;
/**
 * Áp tốc độ tua luôn theo hai bước: về 1 rồi mới lên giá trị thật sau khoảng này.
 * Đúng thao tác "chọn X1 rồi chọn X2" mà tay người dùng phải làm — vì
 * RCTVideo.setRate chỉ đi đường an toàn (hoãn rồi applyModifiers) khi rate hiện
 * tại khác 1; đường trực tiếp bị AVPlayer bỏ qua lúc vừa seek/vừa gom buffer.
 */
const PLAYBACK_RATE_REAPPLY_MS = 140;
/** Giãn nhịp giữa hai lần ép lại tốc độ, tránh dồn vào một chuỗi stall. */
const PLAYBACK_RATE_REAPPLY_THROTTLE_MS = 1000;
/**
 * Số lần ép lại liên tiếp trước khi bỏ — reset ngay khi đo được đúng tốc độ.
 * Vài lần đầu có thể rơi vào pha buffer nên vẫn trượt, cần dư một chút.
 */
const PLAYBACK_RATE_MAX_RETRY = 5;
/** Áp lại tốc độ sau khi seek trong phiên: chờ player seek xong đã. */
const PLAYBACK_RATE_AFTER_SEEK_MS = 400;
/**
 * Không có API đọc rate thật (VideoRef không có getter, onPlaybackRateChange thì
 * im lặng khi lệnh bị nuốt). Nên tự đo: mỗi cửa sổ này so thời gian media chạy
 * được với thời gian thực, ra đúng tốc độ người dùng đang thấy.
 */
const PLAYBACK_RATE_CHECK_WINDOW_MS = 1200;
/** Sai số cho phép khi so tốc độ đo được với tốc độ mong muốn. */
const PLAYBACK_RATE_TOLERANCE = 0.25;
/**
 * Chừa mép khi seek trong phiên đang chạy: sát cuối phần đã publish thì player
 * phải chờ segment mới, thà mở phiên mới từ đúng mốc đó.
 */
const PLAYBACK_SEEK_EDGE_MARGIN_SEC = 3;
/** Kênh báo playhead đứt thì tự nối lại, giãn dần. */
const PLAYBACK_SOCKET_RETRY_BASE_MS = 1000;
const PLAYBACK_SOCKET_RETRY_MAX_MS = 8000;
const PLAYBACK_SOCKET_MAX_RETRY = 6;
/**
 * Player lỗi giữa phiên thì tự mở lại phiên từ đúng vị trí đang xem trước, hết
 * số lần này mới bỏ về xem trực tiếp kèm thông báo.
 */
const PLAYBACK_ERROR_MAX_RETRY = 2;
const PLAYBACK_ERROR_RETRY_BASE_MS = 800;
/** Cách lần lỗi trước quá lâu thì tính là sự cố mới, hạn mức thử được mở lại. */
const PLAYBACK_ERROR_RETRY_RESET_MS = 30000;
/**
 * Với "hôm nay", phiên chỉ chạy tới thời điểm mở phiên. Playhead tới gần mép này
 * là đã bắt kịp hiện tại — chuyển sang xem trực tiếp thay vì để gateway đóng
 * phiên rồi player bắn lỗi 404.
 */
const PLAYBACK_CAUGHT_UP_LEAD_SEC = 10;
const PLAYBACK_CAUGHT_UP_MIN_PLAYED_SEC = 3;
/**
 * Mang mốc giờ sang "hôm nay" thì lùi lại chừng này giây so với hiện tại: sát
 * mép live thường chưa có bản ghi, seek vào đó là báo không có dữ liệu.
 */
const PLAYBACK_CARRY_LIVE_MARGIN_SEC = 30;
/**
 * Toàn màn hình: thanh tua phải nằm trên vùng cử chỉ home indicator, và hàng nút
 * phải nằm trên thanh tua. Cộng thêm safe area thật của thiết bị.
 */
const FULLSCREEN_SCRUBBER_LIFT = 8;
const FULLSCREEN_CONTROLS_LIFT = 50;
const TIMELINE_SCALE_STEP = 0.25;
const TIMELINE_SCALE_MIN = 0.5;
const TIMELINE_SCALE_MAX = 2;
/**
 * Camera chết/mất mạng thì onError bắn liên tục. Giãn dần thời gian thử lại để
 * không remount player mỗi 2s vô hạn (tốn pin, tốn data), và sau vài lần liên
 * tiếp thì nói cho người dùng biết thay vì để spinner xoay mãi.
 */

const CameraPlayback: React.FC = () => {
  const c = useAppColors();
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const hairlineBorderColor = useHairlineBorderColor();
  const screenDims = useWindowDimensions();

  const { camera } = route.params ?? {};

  const [selectedDate, setSelectedDate] = React.useState(() =>
    startOfDay(new Date()),
  );
  const [selectedStartTimeSec, setSelectedStartTimeSec] = React.useState<
    number | null
  >(null);
  const [pendingSeekSec, setPendingSeekSec] = React.useState<number | null>(
    null,
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
    DEFAULT_PLAYBACK_SPEED,
  );
  const [isSpeedSheetVisible, setIsSpeedSheetVisible] = React.useState(false);
  const [isDateSheetVisible, setIsDateSheetVisible] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"timeline" | "grid">(
    "timeline",
  );
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [timelineScale, setTimelineScale] = React.useState(1);
  const [areControlsVisible, setAreControlsVisible] = React.useState(true);
  const [controlsNonce, setControlsNonce] = React.useState(0);
  const [timelineOffsetY, setTimelineOffsetY] = React.useState(0);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [appliedRate, setAppliedRate] = React.useState<number>(1);
  const [isAppActive, setIsAppActive] = React.useState(true);
  const [liveNowMs, setLiveNowMs] = React.useState(() => Date.now());
  const [recordings, setRecordings] = React.useState<
    Array<{ startMs: number; endMs: number }>
  >([]);
  const [recordingDays, setRecordingDays] = React.useState<number[]>([]);
  const [isRecordingsLoading, setIsRecordingsLoading] = React.useState(true);
  const [recordingsError, setRecordingsError] = React.useState<string | null>(
    null,
  );
  const [loadedRecordingsDayStartMs, setLoadedRecordingsDayStartMs] =
    React.useState<number | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [playbackSession, setPlaybackSession] =
    React.useState<PlaybackSession | null>(null);
  const [playbackError, setPlaybackError] = React.useState<string | null>(null);
  // Chỉ là cờ để đổi kích thước núm; vị trí núm/thanh đầy do Animated.Value lo,
  // nên kéo tua không kéo theo một lượt render toàn màn hình mỗi frame.
  const [isProgressScrubbing, setIsProgressScrubbing] = React.useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = React.useState(0);
  const [scrollAreaHeight, setScrollAreaHeight] = React.useState(0);
  const [isTimelineScrubbing, setIsTimelineScrubbing] = React.useState(false);
  const [liveVideoKey, setLiveVideoKey] = React.useState(0);
  const [networkReconnectNonce, setNetworkReconnectNonce] = React.useState(0);
  const [liveFallbackNoticeNonce, setLiveFallbackNoticeNonce] =
    React.useState(0);

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
  const pingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const timelineSeekTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const liveRetryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTimelineDraggingRef = React.useRef(false);
  const timelineDragGenerationRef = React.useRef(0);
  const timelineMomentumGenerationRef = React.useRef<number | null>(null);
  const startRequestIdRef = React.useRef(0);
  const progressScrubberRef = React.useRef<View>(null);
  const progressTrackWidthRef = React.useRef(0);
  // Toạ độ tuyệt đối của thanh tua: dùng pageX thay cho locationX vì locationX
  // đổi gốc khi ngón tay đi qua núm/thanh con, đúng lúc kéo thì nhảy giật.
  const progressTrackPageXRef = React.useRef(0);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const isProgressScrubbingRef = React.useRef(false);
  const playbackVideoRef = React.useRef<VideoRef>(null);
  // Độ dài đã có thể seek của phiên hiện tại (giây, tính từ mốc mở phiên).
  const seekableDurationRef = React.useRef(0);
  const hasPlaybackProgressRef = React.useRef(false);
  // Số lần đã ép lại tốc độ trong phiên hiện tại — chặn vòng lặp nếu player cứ
  // báo về 1X (ví dụ stream không cho phát nhanh).
  const rateRetryCountRef = React.useRef(0);
  const lastRateApplyAtRef = React.useRef(0);
  const rateApplyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const socketRetryTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const playbackRetryTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  /** Số lần đã tự phát lại sau lỗi player, trong cùng một mạch lỗi. */
  const playbackRetryCountRef = React.useRef(0);
  const lastPlaybackErrorAtRef = React.useRef(0);
  /** Mép cuối của phiên đang chạy — dùng để biết khi nào đã bắt kịp hiện tại. */
  const sessionEndMsRef = React.useRef<number | null>(null);
  /** Thông báo cần hiện lại sau khi bỏ về trực tiếp (xem returnToLiveView). */
  const liveFallbackNoticeRef = React.useRef<string | null>(null);
  // Mốc đo tốc độ thật: cặp (thời gian media, thời gian thực) của lần đo trước.
  const rateSampleRef = React.useRef<{ mediaSec: number; atMs: number } | null>(
    null,
  );
  const lastLiveProgressAtRef = React.useRef(Date.now());
  const liveErrorCountRef = React.useRef(0);
  const activeClipRef = React.useRef<PlaybackClip | null>(null);
  const reconnectIntentRef = React.useRef<
    | { mode: "live" }
    // Không giữ endMs: mép cuối phải tính lại lúc mở phiên (với "hôm nay" nó là
    // "bây giờ"), giữ giá trị cũ thì phiên phục hồi có thể mở với mép đã qua.
    | { mode: "playback"; fromMs: number }
    | null
  >(null);

  // useCallback để listener AppState trong useCameraViewToken không phải
  // subscribe lại mỗi lần render.
  const handleAppActive = React.useCallback(() => setIsAppActive(true), []);
  const handleAppBackground = React.useCallback(
    () => setIsAppActive(false),
    [],
  );

  // Không lấy thumbTimestamp: màn playback không còn dùng ảnh snapshot nữa.
  const {
    cameraToken,
    clearTokenRefreshTimer,
    fetchCameraTokenRef,
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
    }, [clearTokenRefreshTimer, fetchCameraTokenRef]),
  );

  // Suy ra từ đồng hồ live thay vì chốt lúc mount: nếu app mở qua nửa đêm thì
  // "hôm nay" phải đổi theo, nếu không mũi tên ngày sau vẫn bị chặn ở ngày cũ.
  // Vẫn là useMemo theo mốc ms nên identity chỉ đổi mỗi lần sang ngày mới.
  const todayMs = startOfDay(new Date(liveNowMs)).getTime();
  const today = React.useMemo(() => new Date(todayMs), [todayMs]);
  // Chỉ lấy dayStartMs ở đây. Mép cuối ("bây giờ" với hôm nay) luôn phải tính
  // tại thời điểm dùng — xem startFrom và handleNetworkOffline — vì một giá trị
  // memo sẽ đóng băng trong lúc playback (liveNowMs ngừng tick) và phiên mở với
  // mép đã qua sẽ bị gateway đóng ngay.
  const { dayStartMs } = React.useMemo(
    () => getPlaybackDayRange(selectedDate),
    [selectedDate],
  );
  const clipGroups = React.useMemo(
    () => buildPlaybackClipGroups(recordings, dayStartMs),
    [dayStartMs, recordings],
  );

  const activeGroup = React.useMemo(
    () => clipGroups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, clipGroups],
  );
  const activeClip = React.useMemo(
    () => activeGroup?.clips.find((clip) => clip.id === activeClipId) ?? null,
    [activeClipId, activeGroup],
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

  // Thanh tua trải hết bề ngang khung hình nên trùng vùng vuốt-back của iOS, và
  // native-stack giành cử chỉ trước khi responder của thanh tua nhận được touch
  // — kéo tua là thoát màn hình. Tắt vuốt-back khi đang xem lại; nút back trên
  // khung hình và back cứng Android vẫn hoạt động bình thường.
  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: !playbackSession });
  }, [navigation, playbackSession]);

  /**
   * Áp tốc độ tua theo hai bước 1 → giá trị thật. Đây là con đường duy nhất
   * chắc chắn ăn: RCTVideo.setRate chỉ hoãn-rồi-applyModifiers (đường an toàn)
   * khi rate hiện tại khác 1, còn đường trực tiếp thì AVPlayer bỏ qua nếu đang
   * seek hoặc đang gom buffer. Chính vì vậy tay người dùng phải chọn X1 rồi X2
   * mới ăn — ở đây làm thay cho họ.
   */
  const applyPlaybackRate = React.useCallback(
    (target: number, delayMs = 0) => {
      if (rateApplyTimerRef.current) clearTimeout(rateApplyTimerRef.current);
      rateApplyTimerRef.current = null;
      // Phép đo cũ không còn ý nghĩa sau khi đổi tốc độ.
      rateSampleRef.current = null;
      lastRateApplyAtRef.current = Date.now();

      const run = () => {
        setAppliedRate(1);
        if (target === 1) return;
        rateApplyTimerRef.current = setTimeout(() => {
          rateApplyTimerRef.current = null;
          setAppliedRate(target);
        }, PLAYBACK_RATE_REAPPLY_MS);
      };

      if (delayMs <= 0) {
        run();
        return;
      }

      rateApplyTimerRef.current = setTimeout(() => {
        rateApplyTimerRef.current = null;
        run();
      }, delayMs);
    },
    [],
  );

  React.useEffect(
    () => () => {
      if (rateApplyTimerRef.current) clearTimeout(rateApplyTimerRef.current);
      if (playbackRetryTimerRef.current)
        clearTimeout(playbackRetryTimerRef.current);
    },
    [],
  );

  const clearPlaybackRetryTimer = React.useCallback(() => {
    if (playbackRetryTimerRef.current) {
      clearTimeout(playbackRetryTimerRef.current);
      playbackRetryTimerRef.current = null;
    }
  }, []);

  const closePlaybackSocket = React.useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (socketRetryTimerRef.current) {
      clearTimeout(socketRetryTimerRef.current);
      socketRetryTimerRef.current = null;
    }
    if (webSocketRef.current) {
      // Gỡ handler trước khi close: đóng chủ động thì không được kích hoạt
      // nhánh tự kết nối lại.
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
      clearPlaybackRetryTimer();

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
        isProgressScrubbingRef.current = false;
        setIsProgressScrubbing(false);
        hasPlaybackProgressRef.current = false;
        setIsClipEnded(false);
        if (wasPlayingBack) setIsVideoReady(false);
        setIsConnecting(false);
      }
    },
    [clearPlaybackRetryTimer, closePlaybackSocket],
  );

  /**
   * Kênh báo playhead cho gateway. Trước đây đứt là thôi luôn: ping timer bị dọn
   * và không ai mở lại, server ngừng cấp segment nên player treo rồi bắn onError
   * — đúng kiểu "để tự chạy một lúc là đứng". Giờ đứt thì tự nối lại có backoff,
   * miễn phiên vẫn là phiên đang xem.
   */
  const openPlaybackSocket = React.useCallback(
    (sessionId: string, playbackSpeed: PlaybackSpeed, retryCount = 0) => {
      closePlaybackSocket();

      const scheduleRetry = () => {
        if (sessionRef.current?.sessionId !== sessionId) return;
        if (retryCount >= PLAYBACK_SOCKET_MAX_RETRY) return;

        const delayMs = Math.min(
          PLAYBACK_SOCKET_RETRY_MAX_MS,
          PLAYBACK_SOCKET_RETRY_BASE_MS * 2 ** retryCount,
        );
        socketRetryTimerRef.current = setTimeout(() => {
          socketRetryTimerRef.current = null;
          if (sessionRef.current?.sessionId !== sessionId) return;
          openPlaybackSocketRef.current?.(
            sessionId,
            playbackSpeed,
            retryCount + 1,
          );
        }, delayMs);
      };

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
                playbackStartMsRef.current + currentPositionRef.current * 1000,
              ),
            ),
          );
        };

        socket.onopen = () => {
          sendPosition();
          const positionIntervalMs = playbackSpeed >= 2 ? 1000 : 2000;
          pingTimerRef.current = setInterval(sendPosition, positionIntervalMs);
        };
        socket.onclose = () => {
          if (pingTimerRef.current) clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
          if (webSocketRef.current === socket) webSocketRef.current = null;
          scheduleRetry();
        };
        socket.onerror = socket.onclose;
      } catch (error) {
        warn("Playback WebSocket error:", error);
        scheduleRetry();
      }
    },
    [closePlaybackSocket],
  );

  // openPlaybackSocket tự gọi lại chính nó khi retry — đi qua ref để không phải
  // khai báo đệ quy trong useCallback.
  const openPlaybackSocketRef = React.useRef(openPlaybackSocket);
  React.useEffect(() => {
    openPlaybackSocketRef.current = openPlaybackSocket;
  }, [openPlaybackSocket]);

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
    setIsTimelineScrubbing(false);
    setTimelineOffsetY(0);
    viewOffsetsRef.current = { timeline: 0, grid: 0 };
    timelineScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [camera?.iD_Camera_Ma, dayStartMs, stopCurrentSession]);

  React.useEffect(() => {
    if (!cameraToken || !camera?.iD_Camera_Ma) return;

    let cancelled = false;
    setRecordingsError(null);
    setIsRecordingsLoading(true);

    // Mép cuối tính trong effect, KHÔNG lấy từ dayEndMs memo: dayEndMs của "hôm
    // nay" được làm tươi mỗi phút, để nó trong deps là cứ mỗi phút lại tải lại
    // toàn bộ danh sách bản ghi và dựng lại clipGroups — mọi hàng timeline
    // re-render theo, nặng vô ích.
    const range = getPlaybackDayRange(selectedDate);

    getPlaybackRecordings(
      camera.iD_Camera_Ma,
      cameraToken,
      range.dayStartMs,
      range.dayEndMs,
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
            : "Không thể tải danh sách bản ghi.",
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
    dayStartMs,
    networkReconnectNonce,
    selectedDate,
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
          range.dayEndMs,
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
      if (liveRetryTimerRef.current) clearTimeout(liveRetryTimerRef.current);
      stopCurrentSession(false);
    },
    [stopCurrentSession],
  );

  /* ── Nút trên video: hiện vài giây rồi tự ẩn ─────────────────────── */
  // controlsNonce để gia hạn được timer ngay cả khi nút đang hiện: chỉ dựa vào
  // areControlsVisible thì set lại đúng giá trị cũ sẽ không chạy lại effect.
  React.useEffect(() => {
    if (!areControlsVisible) return;

    const timer = setTimeout(
      () => setAreControlsVisible(false),
      CONTROLS_AUTO_HIDE_MS,
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
      [stopCurrentSession],
    ),
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
      },
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

  /**
   * Phiên hiện tại đã stream từ mốc mở phiên tới hết ngày, nên phần lớn thao tác
   * tua rơi vào vùng player đã có sẵn. Seek thẳng trong phiên đó thì không phải
   * gọi /Playback/start, không remount player: không loading, và tốc độ tua đang
   * chọn cũng không bị native đặt lại về 1X.
   *
   * Trả về false khi mốc cần tới nằm ngoài vùng seek được (lùi trước lúc mở
   * phiên, hoặc vượt quá phần đã publish) — lúc đó buộc phải mở phiên mới.
   */
  const trySeekWithinSession = React.useCallback(
    (targetMs: number) => {
      const startMs = playbackStartMsRef.current;
      if (!sessionRef.current || startMs === null || !isVideoReady) return false;

      const offsetSec = (targetMs - startMs) / 1000;
      const seekableSec = seekableDurationRef.current;
      if (offsetSec < 0 || !Number.isFinite(seekableSec)) return false;
      if (offsetSec > seekableSec - PLAYBACK_SEEK_EDGE_MARGIN_SEC) return false;

      playbackVideoRef.current?.seek(offsetSec);
      currentPositionRef.current = offsetSec;
      setPositionSec(offsetSec);
      setIsClipEnded(false);
      setIsPaused(false);
      setPlaybackError(null);
      // Seek xong AVPlayer resume ở 1X, nên áp lại tốc độ — chờ seek settle đã,
      // ép ngay lúc đang seek thì lệnh cũng bị bỏ qua.
      rateRetryCountRef.current = 0;
      if (speed !== 1) applyPlaybackRate(speed, PLAYBACK_RATE_AFTER_SEEK_MS);
      return true;
    },
    [applyPlaybackRate, isVideoReady, speed],
  );

  /**
   * Đưa cả màn hình về trạng thái xem trực tiếp: bỏ bản ghi đang chọn, đóng
   * phiên, cuộn timeline về mốc mới nhất (nhờ vậy nút "Xem trực tiếp" tự ẩn vì
   * isSeeking không còn đúng), và đưa ngày về hôm nay — trực tiếp là stream của
   * hôm nay, để lịch/timeline ở ngày cũ thì khung hình và phần dưới nói hai
   * chuyện khác nhau.
   *
   * `notice` dành cho nhánh bỏ cuộc vì lỗi: đổi ngày kích hoạt effect reset theo
   * ngày, mà effect đó xoá playbackError, nên thông báo phải được đặt lại sau
   * khi reset xong (xem effect ngay dưới).
   */
  const returnToLiveView = React.useCallback(
    (options?: { keepReconnectIntent?: boolean; notice?: string }) => {
      // Hủy seek đang chờ từ onScrollEndDrag/onMomentumScrollEnd. Nếu không,
      // callback cuộn có thể chạy sau thao tác này và tạo lại playback session.
      if (timelineSeekTimerRef.current) {
        clearTimeout(timelineSeekTimerRef.current);
        timelineSeekTimerRef.current = null;
      }
      timelineDragGenerationRef.current += 1;
      timelineMomentumGenerationRef.current = null;
      isTimelineDraggingRef.current = false;
      if (!options?.keepReconnectIntent) reconnectIntentRef.current = null;
      setIsTimelineScrubbing(false);

      stopCurrentSession();
      setActiveGroupId(null);
      setActiveClipId(null);
      setOpenedGroupId(null);
      setPositionSec(0);
      setIsPaused(false);
      setIsConnecting(false);
      setTimelineOffsetY(0);
      viewOffsetsRef.current.timeline = 0;
      timelineScrollRef.current?.scrollTo({ y: 0, animated: true });
      keepControlsVisible();

      // startOfDay(new Date()) thay vì state `today`: liveNowMs ngừng tick
      // trong lúc playback nên state đó có thể đã cũ.
      const todayDate = startOfDay(new Date());
      setSelectedStartTimeSec(null);
      setPendingSeekSec(null);
      setSelectedDate((prev) =>
        prev.getTime() === todayDate.getTime() ? prev : todayDate,
      );

      liveFallbackNoticeRef.current = options?.notice ?? null;
      setLiveFallbackNoticeNonce((value) => value + 1);
    },
    [keepControlsVisible, stopCurrentSession],
  );

  // Chạy sau effect reset-theo-ngày (khai báo sau nên thứ tự flush là vậy), nhờ
  // đó thông báo lỗi không bị lần reset đó xoá mất.
  React.useEffect(() => {
    if (liveFallbackNoticeNonce === 0) return;
    const notice = liveFallbackNoticeRef.current;
    liveFallbackNoticeRef.current = null;
    if (notice) setPlaybackError(notice);
  }, [liveFallbackNoticeNonce]);

  const startFrom = React.useCallback(
    async (fromMs: number, playbackEndMs?: number) => {
      if (!cameraToken || !camera?.iD_Camera_Ma) return;

      // Mép cuối phải tính lại tại đây chứ không dùng dayEndMs đã memo: với
      // "hôm nay" mép đó là "bây giờ", mà liveNowMs ngừng tick trong lúc
      // playback nên giá trị memo đóng băng ở thời điểm mở màn hình. Phiên mở
      // với mép cũ sẽ bị gateway đóng đúng lúc playhead chạm tới → onError.
      const sessionEndMs =
        playbackEndMs ?? getPlaybackDayRange(selectedDate).dayEndMs;
      sessionEndMsRef.current = sessionEndMs;

      // Không chặn theo isConnecting: nếu server trả session mà player không
      // bao giờ phát onLoad/onError thì cờ đó treo mãi và mọi lần chọn bản ghi
      // sau đó bị bỏ qua. startRequestIdRef + stopCurrentSession đã đảm bảo
      // yêu cầu cũ bị vô hiệu và phiên cũ được dọn.
      //
      // resetPlayer = false: giữ player cũ mounted để khung hình đứng lại ở
      // frame cuối (kèm spinner) trong lúc chờ /Playback/start, thay vì nháy
      // đen. Mọi callback của phiên cũ đã bị vô hiệu vì sessionRef về null.
      stopCurrentSession(false);
      const requestId = ++startRequestIdRef.current;
      playbackStartMsRef.current = fromMs;
      currentPositionRef.current = 0;
      setPositionSec(0);
      hasPlaybackProgressRef.current = false;
      rateRetryCountRef.current = 0;
      lastRateApplyAtRef.current = 0;
      rateSampleRef.current = null;
      seekableDurationRef.current = 0;
      // Đặt núm đúng mốc vừa chọn ngay lập tức; chờ onProgress đầu tiên thì
      // thanh tua nháy về đầu một nhịp.
      const startedClip = activeClipRef.current;
      progressAnim.setValue(
        startedClip &&
          fromMs >= startedClip.startMs &&
          fromMs <= startedClip.endMs
          ? Math.min(
              1,
              (fromMs - startedClip.startMs) / 1000 / startedClip.durationSec,
            )
          : 0,
      );
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
            sessionEndMs,
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
              setTimeout(() => resolve(), PLAYBACK_START_RETRY_MS),
            );
            continue;
          }

          if (requestId !== startRequestIdRef.current) return;
          setPlaybackSession(null);
          sessionRef.current = null;
          playbackStartMsRef.current = null;
          // Mở phiên thất bại: đưa cả màn hình về trực tiếp (bỏ bản ghi đang
          // chọn, cuộn timeline về mốc mới nhất, ẩn nút "Xem trực tiếp", đưa
          // ngày về hôm nay) kèm thông báo lỗi, thay vì treo spinner với một
          // bản ghi không bao giờ phát được.
          returnToLiveView({
            keepReconnectIntent: true,
            notice:
              error instanceof Error
                ? error.message
                : "Không thể bắt đầu phát bản ghi.",
          });
        }
      }
    },
    [
      camera?.iD_Camera_Ma,
      cameraToken,
      openPlaybackSocket,
      progressAnim,
      returnToLiveView,
      selectedDate,
      speed,
      stopCurrentSession,
    ],
  );

  const handleNetworkOffline = React.useCallback(() => {
    const playbackStartMs = playbackStartMsRef.current;
    if (playbackStartMs !== null) {
      const { dayEndMs } = getPlaybackDayRange(selectedDate);
      reconnectIntentRef.current = {
        mode: "playback",
        fromMs: Math.min(
          playbackStartMs + currentPositionRef.current * 1000,
          Math.max(playbackStartMs, dayEndMs - 1000),
        ),
      };
    } else if (!reconnectIntentRef.current) {
      reconnectIntentRef.current = { mode: "live" };
    }

    stopCameraWebView(liveWebViewRef.current);
    stopCurrentSession();
    setIsVideoReady(false);
    setPlaybackError(null);
  }, [selectedDate, stopCurrentSession]);

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
    if (networkReconnectNonce === 0 || !cameraToken || !isScreenVisible) return;

    const intent = reconnectIntentRef.current;
    if (!intent) return;
    reconnectIntentRef.current = null;
    setPlaybackError(null);
    setIsVideoReady(false);

    if (intent.mode === "playback") {
      startFrom(intent.fromMs).catch(() => {});
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
  }, [cameraToken, isScreenVisible, networkReconnectNonce, startFrom]);

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
  }, [cameraToken, isPaused, isScreenVisible, liveVideoKey, playbackSession]);

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
        rowHeight,
      );
      const scrollOffset = Math.max(
        0,
        rawTimelineOffset - TIMELINE_READING_OFFSET + TIMELINE_TOP_MARGIN,
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
      // Không cắt phiên ở mép clip: đầu ghi phát tiếp sang bản ghi kế trong
      // cùng một phiên nên hết clip là chạy luôn, không phải dựng session mới.
      if (!trySeekWithinSession(clip.startMs))
        startFrom(clip.startMs).catch(() => {});

      if (viewMode === "timeline") {
        requestAnimationFrame(() => {
          timelineScrollRef.current?.scrollTo({
            y: scrollOffset,
            animated: true,
          });
        });
      }
    },
    [clipGroups, startFrom, timelineScale, trySeekWithinSession, viewMode],
  );

  const getProgressRatioFromEvent = React.useCallback(
    (event: GestureResponderEvent) => {
      const width = progressTrackWidthRef.current;
      if (width <= 0) return 0;
      const offsetX = event.nativeEvent.pageX - progressTrackPageXRef.current;
      return Math.min(1, Math.max(0, offsetX / width));
    },
    [],
  );

  const handleProgressSeekGrant = React.useCallback(
    (event: GestureResponderEvent) => {
      isProgressScrubbingRef.current = true;
      setIsProgressScrubbing(true);
      progressAnim.setValue(getProgressRatioFromEvent(event));
    },
    [getProgressRatioFromEvent, progressAnim],
  );

  // Mỗi frame kéo chỉ đẩy giá trị vào Animated.Value: không setState nên không
  // render lại cây view, núm bám sát ngón tay.
  const handleProgressSeekMove = React.useCallback(
    (event: GestureResponderEvent) => {
      progressAnim.setValue(getProgressRatioFromEvent(event));
    },
    [getProgressRatioFromEvent, progressAnim],
  );

  const handleProgressSeekRelease = React.useCallback(
    (event: GestureResponderEvent) => {
      const ratio = getProgressRatioFromEvent(event);
      progressAnim.setValue(ratio);
      isProgressScrubbingRef.current = false;
      setIsProgressScrubbing(false);
      if (!activeClip || !playbackSession) return;

      // Không seek đúng endMs vì đó là biên ngoài của đoạn ghi.
      const seekableDurationMs = Math.max(
        0,
        activeClip.endMs - activeClip.startMs - 1000,
      );
      const targetMs =
        activeClip.startMs + Math.round(seekableDurationMs * ratio);
      if (!trySeekWithinSession(targetMs)) startFrom(targetMs).catch(() => {});
      keepControlsVisible();
    },
    [
      activeClip,
      getProgressRatioFromEvent,
      keepControlsVisible,
      playbackSession,
      progressAnim,
      startFrom,
      trySeekWithinSession,
    ],
  );

  const handleProgressSeekTerminate = React.useCallback(() => {
    isProgressScrubbingRef.current = false;
    setIsProgressScrubbing(false);
  }, []);

  // Thoát chế độ tua: bỏ bản ghi đang chọn, đưa timeline về mốc mới nhất và
  // cho stream chạy lại.
  const handleBackToLive = React.useCallback(() => {
    returnToLiveView();
    setPlaybackError(null);
  }, [returnToLiveView]);

  const handleTogglePause = React.useCallback(() => {
    // Đã phát hết bản ghi: bấm play là phát lại clip từ đầu.
    if (isClipEnded && activeClip) {
      startFrom(activeClip.startMs).catch(() => {});
      return;
    }

    setIsPaused((prev) => !prev);
  }, [activeClip, isClipEnded, startFrom]);

  const handleSelectSpeed = React.useCallback(
    (nextSpeed: PlaybackSpeed) => {
      setSpeed(nextSpeed);
      setIsSpeedSheetVisible(false);
      rateRetryCountRef.current = 0;
      applyPlaybackRate(nextSpeed);

      const currentSession = sessionRef.current;
      if (currentSession)
        openPlaybackSocket(currentSession.sessionId, nextSpeed);
    },
    [applyPlaybackRate, openPlaybackSocket],
  );

  /**
   * Đổi ngày thì mở ngày mới ở đúng mốc giờ đang xem: đang xem lại thì lấy mốc
   * của bản ghi đang phát, đang xem trực tiếp thì lấy giờ hiện tại. Ví dụ 9:30
   * ngày 31/07 bấm lùi một ngày là mở 9:30 ngày 30/07 — người dùng so cùng một
   * thời điểm giữa các ngày, chứ không phải mở lại từ mốc mới nhất.
   *
   * Trả về false khi không suy ra được mốc hợp lệ; lúc đó ngày mới mở ở mốc mới
   * nhất như cũ.
   */
  const carryPlaybackTimeToDate = React.useCallback(
    (nextDate: Date) => {
      const startMs = playbackStartMsRef.current;
      const secOfDay =
        startMs !== null
          ? (startMs + currentPositionRef.current * 1000 - dayStartMs) / 1000
          : (Date.now() - startOfDay(new Date()).getTime()) / 1000;
      if (!Number.isFinite(secOfDay) || secOfDay < 0) return false;

      // Sang "hôm nay" thì mốc mang theo có thể vượt quá hiện tại (ví dụ đang
      // xem 23:00 của hôm qua) — chặn lại trước hiện tại một chút cho chắc là
      // vẫn nằm trong vùng đã ghi.
      const todayStartMs = startOfDay(new Date()).getTime();
      const maxSecOfDay =
        startOfDay(nextDate).getTime() === todayStartMs
          ? (Date.now() - todayStartMs) / 1000 - PLAYBACK_CARRY_LIVE_MARGIN_SEC
          : 24 * 60 * 60 - 1;
      if (maxSecOfDay <= 0) return false;

      setPendingSeekSec(Math.round(Math.max(0, Math.min(secOfDay, maxSecOfDay))));
      return true;
    },
    [dayStartMs],
  );

  const handleChangeDate = React.useCallback(
    (amount: number) => {
      const next = startOfDay(addDays(selectedDate, amount));
      // Không cho chọn ngày ở tương lai.
      if (next.getTime() > startOfDay(new Date()).getTime()) return;

      // Giờ bắt đầu chỉ thuộc về ngày đã chọn trong lịch; đổi ngày bằng mũi tên
      // thì bỏ nó đi, nếu không sheet lịch mở lại vẫn hiện giờ cũ của ngày khác.
      setSelectedStartTimeSec(null);
      carryPlaybackTimeToDate(next);
      setSelectedDate(next);
    },
    [carryPlaybackTimeToDate, selectedDate],
  );

  const handleConfirmDate = React.useCallback(
    (date: Date, startTimeSec: number | null) => {
      const nextDate = startOfDay(date);
      const isSameDay = nextDate.getTime() === selectedDate.getTime();
      setSelectedDate(nextDate);
      setSelectedStartTimeSec(startTimeSec);
      setIsDateSheetVisible(false);
      setOpenedGroupId(null);

      // Chọn giờ cụ thể trong lịch thì giờ đó thắng.
      if (startTimeSec !== null) {
        setPendingSeekSec(startTimeSec);
        return;
      }

      // Xác nhận lại đúng ngày đang xem mà không chọn giờ: không làm gì. Nếu vẫn
      // mang mốc sang thì đang xem trực tiếp sẽ bị kéo vào playback, còn đang
      // xem lại thì phải dựng lại phiên ở đúng chỗ cũ — cả hai đều vô ích.
      if (isSameDay) return;

      // Đổi ngày: mang mốc đang xem sang ngày mới.
      if (carryPlaybackTimeToDate(nextDate)) return;

      setTimelineOffsetY(0);
      viewOffsetsRef.current = { timeline: 0, grid: 0 };
      timelineScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [carryPlaybackTimeToDate, selectedDate],
  );

  const loadRecordingDays = React.useCallback(
    async (month: Date) => {
      if (!cameraToken || !camera?.iD_Camera_Ma) return;

      const days = await getPlaybackRecordingDays(
        camera.iD_Camera_Ma,
        cameraToken,
        month.getFullYear(),
        month.getMonth() + 1,
      );
      setRecordingDays(days);
    },
    [camera?.iD_Camera_Ma, cameraToken],
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

  const handleOpenGroup = React.useCallback((group: PlaybackClipGroup) => {
    setOpenedGroupId(group.id);
  }, []);

  const handleCloseGroup = React.useCallback(() => {
    setOpenedGroupId(null);
  }, []);

  const handleTimelineScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextOffset = event.nativeEvent.contentOffset.y;
      setTimelineOffsetY(nextOffset);

      viewOffsetsRef.current[viewMode] = nextOffset;
    },
    [viewMode],
  );

  const findClipAtMs = React.useCallback(
    (
      targetMs: number,
    ): { clip: PlaybackClip; group: PlaybackClipGroup } | null => {
      for (const group of clipGroups) {
        const clip = group.clips.find(
          (item) => targetMs >= item.startMs && targetMs <= item.endMs,
        );
        if (clip) return { clip, group };
      }
      return null;
    },
    [clipGroups],
  );

  /** Bản ghi kế tiếp theo chiều tiến của thời gian (hàng phía trên timeline). */
  const findNextClipAfterMs = React.useCallback(
    (
      targetMs: number,
    ): { clip: PlaybackClip; group: PlaybackClipGroup } | null => {
      let next: { clip: PlaybackClip; group: PlaybackClipGroup } | null = null;
      for (const group of clipGroups) {
        for (const clip of group.clips) {
          if (clip.startMs <= targetMs) continue;
          if (!next || clip.startMs < next.clip.startMs) next = { clip, group };
        }
      }
      return next;
    },
    [clipGroups],
  );

  const commitTimelineSeek = React.useCallback(
    (offsetY: number) => {
      setIsTimelineScrubbing(false);
      if (viewMode !== "timeline" || clipGroups.length === 0) return;

      const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
      const targetSec = getScrubSecAtOffset(
        clipGroups,
        offsetY + TIMELINE_READING_OFFSET - TIMELINE_TOP_MARGIN,
        rowHeight,
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
      const seekMs = Math.max(
        target.clip.startMs,
        Math.min(targetMs, target.clip.endMs - 1000),
      );
      if (!trySeekWithinSession(seekMs)) startFrom(seekMs).catch(() => {});
      keepControlsVisible();
    },
    [
      clipGroups,
      dayStartMs,
      findClipAtMs,
      keepControlsVisible,
      startFrom,
      timelineScale,
      trySeekWithinSession,
      viewMode,
    ],
  );

  const handleTimelineScrollBeginDrag = React.useCallback(() => {
    // Đang tự tay cuộn: badge phải đọc theo vạch, không dính vào đồng hồ của
    // clip đang phát — nếu không thì cuộn cỡ nào con số cũng đứng yên.
    setIsTimelineScrubbing(true);
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
    [commitTimelineSeek],
  );

  const handleTimelineMomentumBegin = React.useCallback(() => {
    timelineMomentumGenerationRef.current = timelineDragGenerationRef.current;
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
    [commitTimelineSeek],
  );

  const handleZoom = React.useCallback((amount: number) => {
    setTimelineScale((prev) =>
      Math.min(TIMELINE_SCALE_MAX, Math.max(TIMELINE_SCALE_MIN, prev + amount)),
    );
  }, []);

  React.useEffect(() => {
    if (pendingSeekSec === null || loadedRecordingsDayStartMs !== dayStartMs)
      return;

    if (clipGroups.length === 0) {
      // EmptyState của timeline đã báo "Không có bản ghi" rồi, không hiện thêm
      // banner lỗi cùng nghĩa.
      setPendingSeekSec(null);
      return;
    }

    const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
    const rawTimelineOffset = getTimelineOffsetForSec(
      clipGroups,
      pendingSeekSec,
      rowHeight,
    );
    const scrollOffset = Math.max(
      0,
      rawTimelineOffset - TIMELINE_READING_OFFSET + TIMELINE_TOP_MARGIN,
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
          Math.min(targetMs, target.clip.endMs - 1000),
        ),
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

  // Một phiên chạy xuyên nhiều bản ghi, nên bản ghi "đang phát" phải suy ra từ
  // mốc thời gian hiện tại chứ không phải từ lúc bấm chọn: qua mép clip là đổi
  // highlight hàng và đổi mốc của thanh tua sang bản ghi mới.
  React.useEffect(() => {
    const playbackStartMs = playbackStartMsRef.current;
    if (!playbackSession || playbackStartMs === null) return;

    const current = findClipAtMs(playbackStartMs + positionSec * 1000);
    // Đang ở khoảng trống giữa hai bản ghi: giữ nguyên bản ghi cũ cho tới khi
    // đầu ghi đưa được hình của bản ghi kế tiếp.
    if (!current) return;
    if (current.clip.id !== activeClipId) setActiveClipId(current.clip.id);
    if (current.group.id !== activeGroupId) setActiveGroupId(current.group.id);
  }, [
    activeClipId,
    activeGroupId,
    findClipAtMs,
    playbackSession,
    positionSec,
  ]);

  // Vạch đọc là "chỗ đang phát": kéo timeline theo mốc phát để hàng nằm tại
  // vạch luôn khớp badge — cả khi tự phát lẫn sau khi seek bằng thanh tiến
  // trình trên khung hình. Nhường quyền cuộn cho ngón tay và cho sheet clip.
  React.useEffect(() => {
    const playbackStartMs = playbackStartMsRef.current;
    if (viewMode !== "timeline" || clipGroups.length === 0) return;
    if (!playbackSession || playbackStartMs === null) return;
    if (isTimelineScrubbing || isTimelineDraggingRef.current) return;
    if (openedGroupId) return;
    // Cuộn tới chỗ trống ("không có bản ghi tại thời điểm này") thì phiên cũ
    // vẫn đang phát — giữ nguyên vị trí người dùng vừa chọn, đừng kéo về.
    if (playbackError) return;

    const rowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
    const clockSec = (playbackStartMs - dayStartMs) / 1000 + positionSec;
    const target = Math.max(
      0,
      getTimelineOffsetForSec(clipGroups, clockSec, rowHeight) -
        TIMELINE_READING_OFFSET +
        TIMELINE_TOP_MARGIN,
    );
    // Bám sát từng tick tiến trình, không animate và không giãn nhịp: cuộn có
    // animation sẽ bị tick sau đè lên giữa đường nên vừa trễ vừa rung. Ngưỡng
    // dưới-pixel chỉ để bỏ qua các tick không làm gì.
    if (Math.abs(target - timelineOffsetY) < 0.1) return;

    viewOffsetsRef.current.timeline = target;
    timelineScrollRef.current?.scrollTo({ y: target, animated: false });
  }, [
    clipGroups,
    dayStartMs,
    isTimelineScrubbing,
    openedGroupId,
    playbackError,
    playbackSession,
    positionSec,
    timelineOffsetY,
    timelineScale,
    viewMode,
  ]);

  if (!camera) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
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
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
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
    screenDims.height - insets.top - playerHeight,
  );
  const timelineRowHeight = Math.round(TIMELINE_ROW_HEIGHT * timelineScale);
  const baseScrollPadBottom = insets.bottom + spacing.lg;
  // Vạch đọc nằm sát đỉnh vùng cuộn, nên nếu chỉ chừa padding thường thì hàng
  // cũ nhất dừng lại ở đáy màn hình và không bao giờ trôi lên tới vạch. Đoạn
  // rail kéo thêm này bù đúng phần thiếu: cuộn hết đường là mép dưới hàng cuối
  // trùng vạch đọc, tức đọc được mốc bản ghi sớm nhất của ngày.
  const timelineRailTailHeight = Math.max(
    0,
    scrollAreaHeight - TIMELINE_TOP_MARGIN - baseScrollPadBottom,
  );
  // Thời gian tại vạch đọc — cuộn xuống thì lùi dần về quá khứ.
  const scrubSec = getScrubSecAtOffset(
    clipGroups,
    timelineOffsetY + TIMELINE_READING_OFFSET - TIMELINE_TOP_MARGIN,
    timelineRowHeight,
  );
  // Đang tua khi đã chọn một bản ghi, hoặc đã cuộn timeline rời khỏi mốc mới nhất.
  const isSeeking =
    Boolean(activeGroup) ||
    (viewMode === "timeline" && timelineOffsetY > LIVE_RETURN_SCROLL_THRESHOLD);
  const isSelectedToday = selectedDate.getTime() === today.getTime();
  const playbackClockSec =
    playbackSession && playbackStartMsRef.current !== null
      ? (playbackStartMsRef.current - dayStartMs) / 1000 + positionSec
      : null;
  const liveClockSec = Math.max(0, (liveNowMs - dayStartMs) / 1000);
  const displayedTimelineSec =
    isTimelineScrubbing && viewMode === "timeline"
      ? scrubSec ?? playbackClockSec
      : playbackClockSec ??
        (!isSeeking && isSelectedToday ? liveClockSec : scrubSec);
  // Tạm dừng thì mở đầy đủ điều khiển + thanh tiến trình như app tham chiếu.
  const showPlaybackControls = Boolean(activeClip && playbackSession);
  // Đang xem lại nhưng phiên vừa bị đóng để mở phiên mới (đổi mốc, tự sang bản
  // ghi kế, chờ mạng lại). Không được rơi về luồng trực tiếp trong lúc này:
  // phần dưới vẫn là xem lại, mà khung hình lại chiếu live thì lệch hẳn.
  const isPlaybackPending =
    !playbackSession && (isConnecting || Boolean(activeClip));
  // Phiên có thể đã chạy sang bản ghi khác so với lúc bấm chọn, nên vị trí
  // trong clip phải tính từ mốc thời gian hiện tại trừ đầu clip đang phát.
  const clipElapsedSec =
    activeClip && playbackStartMsRef.current !== null
      ? Math.min(
          activeClip.durationSec,
          Math.max(
            0,
            (playbackStartMsRef.current + positionSec * 1000 -
              activeClip.startMs) /
              1000,
          ),
        )
      : 0;
  // Tỷ lệ 0..1 → px trên thanh tua. Không phải hook nên đặt được ở đây, sau các
  // nhánh return sớm phía trên.
  const progressWidthRange = {
    inputRange: [0, 1],
    outputRange: [0, progressTrackWidth],
  };
  const cameraTitle = camera.iD_Camera_MoTa || camera.iD_Camera_Ma || "Camera";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
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
              // Key CỐ ĐỊNH, không gắn sessionId: đổi phiên chỉ đổi prop source
              // nên native player được giữ nguyên. Trước đây key theo sessionId
              // làm mỗi lần đổi mốc là tháo/dựng lại một AVPlayer — vừa nháy đen
              // vừa là chỗ dễ crash khi tháo player đang nạp dở.
              key="playback"
              ref={playbackVideoRef}
              source={{ uri: resolvePlaybackHlsUrl(playbackSession.hlsUrl) }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              muted
              paused={!isScreenVisible || isPaused || isConnecting}
              rate={appliedRate}
              repeat={false}
              controls={false}
              progressUpdateInterval={PLAYBACK_PROGRESS_INTERVAL_MS}
              disableFocus
              useTextureView
              hideShutterView
              // false có chủ ý: react-native-video chỉ dùng
              // playImmediately(atRate:) ở nhánh này (RCTVideo.setPaused), tức
              // tốc độ tua được áp nguyên tử cùng lệnh play. Nhánh true là
              // play() rồi mới gán rate, và AVPlayer bỏ qua lần gán đó khi vừa
              // seek/vừa gom buffer — chính là lỗi chọn x2 không ăn, phải chọn
              // x1 rồi x2 lại mới được.
              automaticallyWaitsToMinimizeStalling={false}
              preferredForwardBufferDuration={30}
              bufferConfig={{
                minBufferMs: 10000,
                maxBufferMs: 120000,
                bufferForPlaybackMs: 2000,
                bufferForPlaybackAfterRebufferMs: 5000,
                backBufferDurationMs: 90000,
              }}
              onLoad={() => {
                if (sessionRef.current?.sessionId !== playbackSession.sessionId)
                  return;
                setIsVideoReady(true);
                setIsConnecting(false);
              }}
              onReadyForDisplay={() => {
                if (sessionRef.current?.sessionId === playbackSession.sessionId)
                  setIsVideoReady(true);
              }}
              onProgress={({ currentTime, seekableDuration }) => {
                if (sessionRef.current?.sessionId !== playbackSession.sessionId)
                  return;
                currentPositionRef.current = currentTime;
                // Vùng đã seek được của phiên — dùng để quyết định tua bằng
                // seek trong phiên hay phải mở phiên mới.
                if (Number.isFinite(seekableDuration))
                  seekableDurationRef.current = seekableDuration;
                // Phiên mới bắt đầu chạy: áp tốc độ đã chọn. Phiên mount với
                // rate = tốc độ đó rồi, nhưng lệnh lúc mount hay bị AVPlayer bỏ
                // qua, nên áp lại bằng đường hai bước cho chắc.
                if (!hasPlaybackProgressRef.current) {
                  hasPlaybackProgressRef.current = true;
                  if (speed !== 1) applyPlaybackRate(speed);
                }
                // Đang kéo thì ngón tay là chủ: không đẩy núm về mốc đang phát,
                // và cũng không setState để lúc kéo không có render nào chen
                // vào giữa các frame.
                if (isProgressScrubbingRef.current) return;
                setPositionSec(currentTime);

                // Phiên của "hôm nay" chỉ chạy tới thời điểm mở phiên. Playhead
                // tới sát mép đó tức đã bắt kịp hiện tại — sang xem trực tiếp,
                // thay vì phát tới hết rồi bị gateway đóng phiên và ăn onError.
                const sessionEndMs = sessionEndMsRef.current;
                const playbackStartMs = playbackStartMsRef.current;
                if (
                  isSelectedToday &&
                  sessionEndMs !== null &&
                  playbackStartMs !== null &&
                  // Đã phát được một đoạn: chọn đúng mốc sát hiện tại thì để nó
                  // chạy chứ đừng đẩy về live ngay khi vừa bấm.
                  currentTime >= PLAYBACK_CAUGHT_UP_MIN_PLAYED_SEC &&
                  sessionEndMs - (playbackStartMs + currentTime * 1000) <=
                    PLAYBACK_CAUGHT_UP_LEAD_SEC * 1000
                ) {
                  handleBackToLive();
                  return;
                }

                // Đo tốc độ thật = thời gian media chạy được / thời gian thực.
                // Không có API đọc rate, và onPlaybackRateChange im lặng đúng
                // lúc lệnh bị nuốt, nên đây là cách duy nhất biết được sự thật.
                if (isPaused) {
                  rateSampleRef.current = null;
                } else {
                  const now = Date.now();
                  const sample = rateSampleRef.current;
                  if (!sample) {
                    rateSampleRef.current = { mediaSec: currentTime, atMs: now };
                  } else if (
                    now - sample.atMs >=
                    PLAYBACK_RATE_CHECK_WINDOW_MS
                  ) {
                    const effective =
                      (currentTime - sample.mediaSec) /
                      ((now - sample.atMs) / 1000);
                    rateSampleRef.current = { mediaSec: currentTime, atMs: now };

                    if (
                      Math.abs(effective - speed) <=
                      speed * PLAYBACK_RATE_TOLERANCE
                    ) {
                      // Đúng tốc độ — mở lại hạn mức cho lần stall sau.
                      rateRetryCountRef.current = 0;
                    } else if (
                      // Chạy trơn nhưng ở 1X: lệnh rate đã bị nuốt, ép lại.
                      Math.abs(effective - 1) <= PLAYBACK_RATE_TOLERANCE &&
                      rateRetryCountRef.current < PLAYBACK_RATE_MAX_RETRY &&
                      now - lastRateApplyAtRef.current >=
                        PLAYBACK_RATE_REAPPLY_THROTTLE_MS
                    ) {
                      rateRetryCountRef.current += 1;
                      applyPlaybackRate(speed);
                    }
                    // Còn lại là chạy chậm hơn cả 1X, tức đói buffer (gateway
                    // cấp dữ liệu theo thời gian thực) — ép rate không giải
                    // quyết được, để yên cho player tự gom.
                  }
                }

                const clip = activeClipRef.current;
                const startMs = playbackStartMsRef.current;
                if (!clip || startMs === null) return;
                const elapsedSec =
                  (startMs + currentTime * 1000 - clip.startMs) / 1000;
                progressAnim.setValue(
                  Math.min(1, Math.max(0, elapsedSec / clip.durationSec)),
                );
              }}
              onEnd={() => {
                if (sessionRef.current?.sessionId !== playbackSession.sessionId)
                  return;

                // Phiên chạy tới hết ngày nên onEnd chỉ nổ khi đầu ghi thật sự
                // dừng ở mép một bản ghi. Còn bản ghi sau thì mở phiên mới từ
                // đó, người dùng không phải bấm gì; hết hẳn mới dừng và cho
                // phát lại. Không tự nhảy khi màn hình đang ẩn hoặc đang tạm
                // dừng để không âm thầm tải tiếp.
                const startMs = playbackStartMsRef.current;
                const next =
                  startMs === null || !isScreenVisible || isPaused
                    ? null
                    : findNextClipAfterMs(
                        startMs + currentPositionRef.current * 1000,
                      );

                if (next) {
                  setActiveGroupId(next.group.id);
                  setActiveClipId(next.clip.id);
                  startFrom(next.clip.startMs).catch(() => {});
                  return;
                }

                setIsPaused(true);
                setIsClipEnded(true);
              }}
              onError={(error) => {
                if (sessionRef.current?.sessionId !== playbackSession.sessionId)
                  return;
                warn("Playback video error:", error);

                // Lỗi cách lần trước đủ lâu thì coi là sự cố mới, mở lại hạn
                // mức thử. Nhờ vậy không bao giờ có vòng lặp load → lỗi → thử
                // lại vô hạn, mà cũng không mất khả năng phục hồi về sau.
                const errorAt = Date.now();
                if (
                  errorAt - lastPlaybackErrorAtRef.current >
                  PLAYBACK_ERROR_RETRY_RESET_MS
                )
                  playbackRetryCountRef.current = 0;
                lastPlaybackErrorAtRef.current = errorAt;

                const startMs = playbackStartMsRef.current;
                const resumeMs =
                  startMs === null
                    ? null
                    : startMs + currentPositionRef.current * 1000;

                // Lỗi giữa phiên thường là phiên bị server đóng hoặc mạng chớp,
                // không phải bản ghi hỏng. Tự mở lại phiên từ đúng vị trí đang
                // xem trước đã — khung hình giữ frame cuối kèm spinner nên
                // người dùng chỉ thấy một nhịp chờ, không bị đẩy về trực tiếp.
                if (
                  resumeMs !== null &&
                  isScreenVisible &&
                  playbackRetryCountRef.current < PLAYBACK_ERROR_MAX_RETRY
                ) {
                  const attempt = (playbackRetryCountRef.current += 1);
                  stopCurrentSession(false);
                  setIsConnecting(true);
                  if (playbackRetryTimerRef.current)
                    clearTimeout(playbackRetryTimerRef.current);
                  playbackRetryTimerRef.current = setTimeout(() => {
                    playbackRetryTimerRef.current = null;
                    startFrom(resumeMs).catch(() => {});
                  }, PLAYBACK_ERROR_RETRY_BASE_MS * attempt);
                  return;
                }

                // Thử hết vẫn không được: về xem trực tiếp kèm thông báo. Ý
                // định phát lại vẫn nằm trong reconnectIntentRef cho trường hợp
                // có mạng trở lại.
                if (resumeMs !== null) {
                  reconnectIntentRef.current = {
                    mode: "playback",
                    fromMs: resumeMs,
                  };
                }
                // Bỏ cuộc: đưa cả màn hình về trực tiếp cho khớp với khung
                // hình — bỏ bản ghi đang chọn, cuộn timeline về mốc mới nhất
                // nên nút "Xem trực tiếp" tự ẩn. Giữ lại reconnect intent để
                // khi có mạng lại thì phát tiếp đúng chỗ.
                returnToLiveView({
                  keepReconnectIntent: true,
                  notice: "Không thể phát bản ghi.",
                });
              }}
            />

            ) : isPlaybackPending ? null : Platform.OS === "android" ? (
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
                if (liveRetryTimerRef.current) {
                  clearTimeout(liveRetryTimerRef.current);
                  liveRetryTimerRef.current = null;
                }
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
                  attempt >= ANDROID_LIVE_ERROR_NOTICE_AFTER
                    ? "Không thể phát camera trực tiếp. Đang thử lại..."
                    : null,
                );

                if (liveRetryTimerRef.current)
                  clearTimeout(liveRetryTimerRef.current);
                liveRetryTimerRef.current = setTimeout(() => {
                  liveRetryTimerRef.current = null;
                  lastLiveProgressAtRef.current = Date.now();
                  setLiveVideoKey((value) => value + 1);
                }, Math.min(ANDROID_LIVE_RETRY_MAX_MS, ANDROID_LIVE_RETRY_BASE_MS * 2 ** (attempt - 1)));
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
              <CameraStatusChip
                isLive={!isSeeking}
                label={
                  isSeeking
                    ? displayedTimelineSec === null
                      ? "XEM LẠI"
                      : formatClock(displayedTimelineSec)
                    : "TRỰC TIẾP"
                }
              />
            </View>
          ) : null}

          {areControlsVisible ? (
            <View
              style={[
                styles.playerControls,
                isFullscreen && styles.playerControlsFullscreen,
                isFullscreen && {
                  bottom: insets.bottom + FULLSCREEN_CONTROLS_LIFT,
                },
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
                    name={isClipEnded ? "refresh" : isPaused ? "play" : "pause"}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>

                {showPlaybackControls && activeClip ? (
                  <Text style={styles.playerClock} allowFontScaling={false}>
                    {`${formatElapsed(clipElapsedSec)} / ${formatElapsed(
                      activeClip.durationSec,
                    )}`}
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
              ref={progressScrubberRef}
              style={[
                styles.progressScrubber,
                isFullscreen && styles.progressScrubberFullscreen,
                isFullscreen && {
                  bottom: insets.bottom + FULLSCREEN_SCRUBBER_LIFT,
                },
              ]}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                progressTrackWidthRef.current = width;
                setProgressTrackWidth(width);
                // Cần toạ độ theo cửa sổ để quy đổi pageX; layout.x chỉ là vị
                // trí so với view cha.
                progressScrubberRef.current?.measureInWindow((pageX) => {
                  progressTrackPageXRef.current = pageX;
                });
              }}
              onStartShouldSetResponder={() =>
                Boolean(activeClip && playbackSession && !isConnecting)
              }
              onMoveShouldSetResponder={() =>
                Boolean(activeClip && playbackSession && !isConnecting)
              }
              onResponderGrant={handleProgressSeekGrant}
              onResponderMove={handleProgressSeekMove}
              onResponderRelease={handleProgressSeekRelease}
              onResponderTerminate={handleProgressSeekTerminate}
              accessibilityLabel="Tua vị trí phát"
            >
              <View style={styles.progressTrackWrap}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: progressAnim.interpolate(progressWidthRange) },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.progressHandle,
                      // Núm to hơn trong lúc kéo để thấy rõ đang tua.
                      isProgressScrubbing && styles.progressHandleActive,
                      {
                        transform: [
                          {
                            translateX:
                              progressAnim.interpolate(progressWidthRange),
                          },
                        ],
                      },
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
                  color={c.textSecondary}
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
                <Ionicons name="funnel-outline" size={14} color={c.textSub} />
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
                  color={c.textSecondary}
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
                color={viewMode === "grid" ? c.red : c.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {playbackError ? (
            <View style={styles.playbackStatus}>
              <Ionicons name="alert-circle-outline" size={18} color={c.red} />
              <Text style={styles.playbackStatusText}>{playbackError}</Text>
            </View>
          ) : null}

          {/* Bọc riêng vùng cuộn để nút zoom canh giữa theo đúng vùng này,
              không tính cả chiều cao player. */}
          <View
            style={styles.scrollArea}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setScrollAreaHeight((prev) =>
                Math.abs(prev - height) > 1 ? height : prev,
              );
            }}
          >
            <ScrollView
              ref={timelineScrollRef}
              contentContainerStyle={[
                styles.scrollContent,
                // Không còn thanh chức năng ở đáy nên timeline tự chừa safe area.
                { paddingBottom: baseScrollPadBottom },
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
                emptySubtitle={"Chưa có bản ghi nào trong ngày đã chọn."}
                errorMessage={recordingsError}
                groups={clipGroups}
                groupSheetHeight={groupSheetHeight}
                onCloseGroup={handleCloseGroup}
                onOpenGroup={handleOpenGroup}
                onSelectGroup={handleSelectGroup}
                openedGroupId={openedGroupId}
                isLoading={isRecordingsLoading}
                playheadSec={playbackSession ? playbackClockSec : null}
                railTailHeight={timelineRailTailHeight}
                scale={timelineScale}
                viewMode={viewMode}
              />
            </ScrollView>

            {/* Timeline rỗng (đang tải/lỗi/không có bản ghi) thì không vẽ vạch
                scrub + badge giờ: không có gì để scrub tới, mà lớp này lại đè
                lên placeholder. */}
            {viewMode !== "timeline" ||
            displayedTimelineSec === null ||
            clipGroups.length === 0 ? null : (
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
                  <Ionicons name="add" size={22} color={c.textSecondary} />
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
                  <Ionicons name="remove" size={22} color={c.textSecondary} />
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
                  <Ionicons name="play-circle" size={20} color={c.onBrand} />
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
