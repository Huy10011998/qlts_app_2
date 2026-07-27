import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Video from "react-native-video";
import WebView from "react-native-webview";
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
  buildMockClipGroups,
  DEFAULT_PLAYBACK_SPEED,
  formatClock,
  getPlaybackDateLabel,
  getPlaybackSpeedBadge,
  getScrubSecAtOffset,
  getTimelineOffsetForSec,
  startOfDay,
  type PlaybackClipGroup,
  type PlaybackSpeed,
} from "./shared/cameraPlaybackHelpers";
import {
  PLAYER_ASPECT_RATIO,
  styles,
  TIMELINE_READING_OFFSET,
  TIMELINE_ROW_HEIGHT,
  TIMELINE_TOP_MARGIN,
} from "./CameraPlayback.styles";

const PROGRESS_TICK_MS = 500;
/** Nút điều khiển trên video tự ẩn sau khoảng này; chạm vào cam để hiện lại. */
const CONTROLS_AUTO_HIDE_MS = 4000;
/** Thời gian chờ trước khi dựng lại player Android sau lỗi stream. */
const ANDROID_VIDEO_RETRY_MS = 5000;
/** Cuộn timeline quá mức này thì coi như đang tua, hiện nút xem trực tiếp. */
const LIVE_RETURN_SCROLL_THRESHOLD = 24;
const TIMELINE_SCALE_STEP = 0.25;
const TIMELINE_SCALE_MIN = 0.5;
const TIMELINE_SCALE_MAX = 2;

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
  const [androidVideoKey, setAndroidVideoKey] = React.useState(0);
  const [isAppActive, setIsAppActive] = React.useState(true);

  const liveWebViewRef = React.useRef<WebView>(null);
  const timelineScrollRef = React.useRef<ScrollView>(null);
  const viewOffsetsRef = React.useRef<Record<"timeline" | "grid", number>>({
    timeline: 0,
    grid: 0,
  });
  const androidRetryRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const dayOffset = React.useMemo(
    () =>
      Math.round(
        (selectedDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      ),
    [selectedDate, today]
  );

  const clipGroups = React.useMemo(
    () => buildMockClipGroups(dayOffset),
    [dayOffset]
  );

  const activeGroup = React.useMemo(
    () => clipGroups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, clipGroups]
  );

  // Đổi ngày thì bản ghi đang phát không còn hợp lệ.
  React.useEffect(() => {
    setActiveGroupId(null);
    setActiveClipId(null);
    setOpenedGroupId(null);
    setPositionSec(0);
    setTimelineOffsetY(0);
    viewOffsetsRef.current = { timeline: 0, grid: 0 };
    timelineScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [dayOffset]);

  /* ── Tiến trình phát (mô phỏng — chưa có API playback) ────────────── */
  React.useEffect(() => {
    if (isPaused || !activeGroup) return;

    const timer = setInterval(() => {
      setPositionSec((prev) => {
        const next = prev + (PROGRESS_TICK_MS / 1000) * speed;

        if (next >= activeGroup.durationSec) {
          setIsPaused(true);
          return activeGroup.durationSec;
        }

        return next;
      });
    }, PROGRESS_TICK_MS);

    return () => clearInterval(timer);
  }, [activeGroup, isPaused, speed]);

  /* ── Stream trực tiếp: đồng bộ trạng thái phát cho iOS ───────────── */
  const isScreenVisible = isFocused && isAppActive;
  const isLiveActive = isScreenVisible && !isPaused;

  React.useEffect(() => {
    if (Platform.OS !== "ios") return;

    const webView = liveWebViewRef.current;

    // Rời màn hoặc app xuống nền: ngắt hẳn kết nối cho đỡ tốn băng thông —
    // lúc này khung hình có đen cũng không ai thấy.
    if (!isScreenVisible) {
      stopCameraWebView(webView);
      return;
    }

    // Người dùng bấm tạm dừng: chỉ pause thẻ video để giữ lại khung hình cuối.
    // Gọi 'stop' ở đây sẽ xoá srcObject và làm màn hình đen thui.
    if (isPaused) {
      pauseCameraWebView(webView);
      return;
    }

    startCameraWebView(webView);
    resumeCameraWebView(webView);
  }, [isPaused, isScreenVisible]);

  React.useEffect(() => {
    if (Platform.OS !== "ios" || !cameraToken) return;
    postCameraWebViewToken(liveWebViewRef.current, cameraToken);
  }, [cameraToken]);

  React.useEffect(
    () => () => {
      if (androidRetryRef.current) clearTimeout(androidRetryRef.current);
    },
    []
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

  const handleAndroidVideoError = React.useCallback(() => {
    if (androidRetryRef.current) clearTimeout(androidRetryRef.current);

    androidRetryRef.current = setTimeout(() => {
      setIsVideoReady(false);
      setAndroidVideoKey((prev) => prev + 1);
    }, ANDROID_VIDEO_RETRY_MS);
  }, []);

  /* ── Toàn màn hình = khoá ngang ──────────────────────────────────── */
  React.useEffect(() => {
    if (!isFocused) return;

    return () => {
      Orientation.lockToPortrait();
    };
  }, [isFocused]);

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

  const handleSelectGroup = React.useCallback(
    (group: PlaybackClipGroup, clipId?: string) => {
      setActiveGroupId(group.id);
      setActiveClipId(clipId ?? null);
      setPositionSec(0);
      setIsPaused(false);
    },
    []
  );

  // Thoát chế độ tua: bỏ bản ghi đang chọn, đưa timeline về mốc mới nhất và
  // cho stream chạy lại.
  const handleBackToLive = React.useCallback(() => {
    setActiveGroupId(null);
    setActiveClipId(null);
    setOpenedGroupId(null);
    setPositionSec(0);
    setIsPaused(false);
    timelineScrollRef.current?.scrollTo({ y: 0, animated: true });
    keepControlsVisible();
  }, [keepControlsVisible]);

  const handleTogglePause = React.useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleReplay10 = React.useCallback(() => {
    setPositionSec((prev) => Math.max(0, prev - 10));
  }, []);

  const handleSelectSpeed = React.useCallback((nextSpeed: PlaybackSpeed) => {
    setSpeed(nextSpeed);
    setIsSpeedSheetVisible(false);
  }, []);

  const handleChangeDate = React.useCallback((amount: number) => {
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

  const handleZoom = React.useCallback((amount: number) => {
    setTimelineScale((prev) =>
      Math.min(TIMELINE_SCALE_MAX, Math.max(TIMELINE_SCALE_MIN, prev + amount))
    );
  }, []);

  React.useEffect(() => {
    if (pendingSeekSec === null || clipGroups.length === 0) return;

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
    const closestGroup = clipGroups.reduce((closest, group) =>
      Math.abs(group.startSec - pendingSeekSec) <
      Math.abs(closest.startSec - pendingSeekSec)
        ? group
        : closest
    );

    setViewMode("timeline");
    setActiveGroupId(closestGroup.id);
    setActiveClipId(null);
    setPositionSec(0);
    setIsPaused(false);
    setTimelineOffsetY(scrollOffset);
    viewOffsetsRef.current.timeline = scrollOffset;
    setPendingSeekSec(null);

    requestAnimationFrame(() => {
      timelineScrollRef.current?.scrollTo({
        y: scrollOffset,
        animated: true,
      });
    });
  }, [clipGroups, pendingSeekSec, timelineScale]);

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
  // Tạm dừng thì mở đầy đủ điều khiển + thanh tiến trình như app tham chiếu.
  const showPlaybackControls = Boolean(activeGroup) || isPaused;
  const progressRatio = activeGroup
    ? Math.min(1, positionSec / activeGroup.durationSec)
    : 0;
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
          {/* Stream trực tiếp — chưa có API phát lại theo mốc thời gian.
              Cùng cách CameraListGrid làm ở chế độ toàn màn hình: Android
              dùng player native, iOS dùng WebView go2rtc, cả hai đều
              contain/không cắt hình để giữ nguyên OSD của camera. */}
          {!cameraToken ? (
            <View style={styles.playerLoading}>
              <IsLoading size="small" />
            </View>
          ) : Platform.OS === "android" ? (
            <>
              <Video
                key={`${camera.iD_Camera}-${androidVideoKey}`}
                source={{
                  uri: getCameraHlsUrl(camera.iD_Camera_Ma),
                  headers: { Authorization: `Bearer ${cameraToken}` },
                }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                // Luôn tắt tiếng: không còn nút bật/tắt tiếng trên player, và
                // WebView iOS cũng chặn autoplay kèm âm thanh.
                muted
                paused={!isLiveActive}
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
                onReadyForDisplay={() => setIsVideoReady(true)}
                onError={handleAndroidVideoError}
              />
              {isVideoReady ? null : (
                <View style={styles.playerLoading}>
                  <IsLoading size="small" />
                </View>
              )}
            </>
          ) : (
            <>
              <WebView
                ref={liveWebViewRef}
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
                }}
                onMessage={(event) => {
                  const message = event.nativeEvent.data;

                  if (message === "ready") {
                    setIsVideoReady(true);
                    return;
                  }

                  if (message === "token_expired") {
                    fetchCameraTokenRef.current?.(true);
                    return;
                  }

                  // HTML fullscreen gửi thêm close_fullscreen (double tap) và
                  // swipe_next/prev. Playback chỉ có một camera nên bỏ qua
                  // swipe, còn double tap dùng để thoát toàn màn hình.
                  if (message === "close_fullscreen" && isFullscreen) {
                    toggleFullscreen();
                  }
                }}
              />
              {isVideoReady ? null : (
                <View style={styles.playerLoading}>
                  <IsLoading size="small" />
                </View>
              )}
            </>
          )}

          {/* Chạm vào khung hình để hiện/ẩn nút. Đặt dưới các nút (khai báo
              trước) nên không chặn thao tác bấm nút. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTogglePlayerControls}
          />

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
            </View>
          ) : null}

          {areControlsVisible ? (
            <View
              style={[
                styles.playerControls,
                isFullscreen && styles.playerControlsFullscreen,
              ]}
            >
              <TouchableOpacity
                style={styles.playerControlBtn}
                onPress={() => {
                  keepControlsVisible();
                  handleTogglePause();
                }}
                hitSlop={8}
                accessibilityLabel={isPaused ? "Phát" : "Tạm dừng"}
              >
                <Ionicons
                  name={isPaused ? "play" : "pause"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              <View style={styles.playerControlSpacer} />

              {isSeeking ? (
                <>
                  <TouchableOpacity
                    style={styles.playerControlBtn}
                    onPress={() => {
                      keepControlsVisible();
                      handleReplay10();
                    }}
                    hitSlop={8}
                    accessibilityLabel="Lùi 10 giây"
                  >
                    <MaterialCommunityIcons
                      name="rewind-10"
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
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
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity
                style={styles.playerControlBtn}
                onPress={toggleFullscreen}
                hitSlop={8}
                accessibilityLabel="Toàn màn hình"
              >
                <MaterialCommunityIcons
                  name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {showPlaybackControls ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressRatio * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.progressHandle,
                  { left: `${progressRatio * 100}%` },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>

      {isFullscreen ? null : (
        <>
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
                onPress={() => setIsDateSheetVisible(true)}
                activeOpacity={0.7}
                accessibilityLabel="Mở lịch chọn ngày"
              >
                <Text style={styles.datePillText} allowFontScaling={false}>
                  {getPlaybackDateLabel(selectedDate, today)}
                </Text>
                <Ionicons name="funnel-outline" size={14} color={C.textSub} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePillBtn}
                onPress={() => handleChangeDate(1)}
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
              style={styles.dateViewBtn}
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
                color={C.textSecondary}
              />
            </TouchableOpacity>
          </View>

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
              scrollEventThrottle={16}
            >
              <PlaybackTimeline
                activeClipId={activeClipId}
                activeGroupId={activeGroupId}
                cameraCode={camera.iD_Camera_Ma}
                cameraId={camera.iD_Camera}
                cameraToken={cameraToken}
                emptySubtitle="Chưa có bản ghi nào trong ngày đã chọn."
                groups={clipGroups}
                groupSheetHeight={groupSheetHeight}
                onCloseGroup={handleCloseGroup}
                onOpenGroup={handleOpenGroup}
                onSelectGroup={handleSelectGroup}
                openedGroupId={openedGroupId}
                scale={timelineScale}
                thumbTimestamp={thumbTimestamp}
                viewMode={viewMode}
              />
            </ScrollView>

            {viewMode !== "timeline" || scrubSec === null ? null : (
              <View style={styles.scrubBadgeWrap} pointerEvents="none">
                <View style={styles.scrubBadge}>
                  <Text style={styles.scrubBadgeText} allowFontScaling={false}>
                    {formatClock(scrubSec)}
                  </Text>
                  <View style={styles.scrubBadgeArrow} />
                </View>
              </View>
            )}

            {viewMode === "timeline" && clipGroups.length > 0 ? (
              <View style={styles.zoomColumn} pointerEvents="box-none">
                <TouchableOpacity
                  style={[styles.zoomBtn, { borderColor: hairlineBorderColor }]}
                  onPress={() => handleZoom(TIMELINE_SCALE_STEP)}
                  accessibilityLabel="Giãn timeline"
                >
                  <Ionicons name="add" size={22} color={C.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.zoomBtn, { borderColor: hairlineBorderColor }]}
                  onPress={() => handleZoom(-TIMELINE_SCALE_STEP)}
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
        onConfirm={handleConfirmDate}
        onClose={() => setIsDateSheetVisible(false)}
      />
    </View>
  );
};

export default CameraPlayback;
