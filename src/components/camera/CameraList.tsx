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
  Animated,
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
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import CameraSnapshotThumbnail from "./shared/CameraSnapshotThumbnail";
import { buildCameraFullscreenHTML } from "./shared/cameraStreamHtml";
import { GO2RTC_HOST } from "./shared/cameraStreamConfig";
import {
  postCameraWebViewToken,
  startCameraWebView,
  stopCameraWebView,
} from "./shared/cameraWebViewMessaging";
import {
  getCameraHlsUrl,
  getCameraSnapshotUrl,
  getVisiblePageIndexes,
} from "./shared/cameraStreamUtils";
import { useCameraViewToken } from "./shared/useCameraViewToken";

const CameraList: React.FC = () => {
  const route = useRoute<any>();
  const { cameras, zoneName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [screenWidth, setScreenWidth] = React.useState(
    Dimensions.get("window").width,
  );
  const [layoutCount, setLayoutCount] = React.useState<number>(4);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [fullscreenCamera, setFullscreenCamera] = React.useState<any | null>(
    null,
  );
  const [page, setPage] = React.useState(0);
  const [isFullMuted, setIsFullMuted] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [focusKey, setFocusKey] = React.useState(0);
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null,
  );
  const translateX = React.useRef(new Animated.Value(0)).current;
  const fsTranslateX = React.useRef(new Animated.Value(0)).current;

  const fullscreenWebViewRef = React.useRef<any>(null);
  const isFirstFocusRef = React.useRef(true);
  const isFocusedRef = React.useRef(false);
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);

  // Android stall detection
  const lastProgressRef = React.useRef<number>(Date.now());
  const androidWatchdogRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const androidFallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const androidReconnectRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [androidVideoKey, setAndroidVideoKey] = React.useState(0);

  const {
    cameraToken,
    cameraTokenRef,
    clearTokenRefreshTimer,
    fetchCameraTokenRef,
    setCameraToken,
    setThumbTimestamp,
    thumbTimestamp,
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
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    if (androidReconnectRef.current) clearTimeout(androidReconnectRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    androidFallbackRef.current = null;
    androidReconnectRef.current = null;
    androidWatchdogRef.current = null;
  }, []);

  React.useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // Orientation listener
  React.useEffect(() => {
    const handler = (orientation: string) => {
      setIsLandscape(
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
      );
    };
    Orientation.addOrientationListener(handler);
    return () => Orientation.removeOrientationListener(handler);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setFocusKey((k) => k + 1);
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        setCameraToken("");
        cameraTokenRef.current = "";
        setThumbTimestamp(0);
      }
      fetchCameraTokenRef.current?.(true);
      return () => {
        clearTokenRefreshTimer();
      };
    }, [clearTokenRefreshTimer, setCameraToken, setThumbTimestamp]),
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
      Orientation.lockToPortrait();
      clearAndroidTimers();
    };
  }, [clearAndroidTimers]);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  const closeFullscreen = () => {
    if (Platform.OS === "ios") {
      Orientation.unlockAllOrientations();
      setTimeout(() => Orientation.lockToPortrait(), 0);
    } else {
      Orientation.lockToPortrait();
    }
    clearAndroidTimers();
    fsTranslateX.setValue(0);
    setFullscreenCamera(null);
    setPendingThumbUrl(null);
    setIsLandscape(false);
  };

  const toggleOrientation = React.useCallback(() => {
    if (isLandscape) {
      setIsLandscape(false);
      if (Platform.OS === "ios") {
        Orientation.unlockAllOrientations();
        setTimeout(() => Orientation.lockToPortrait(), 0);
      } else {
        Orientation.lockToPortrait();
      }
    } else {
      setIsLandscape(true);
      Orientation.lockToLandscapeLeft();
    }
  }, [isLandscape]);

  const handleAndroidReady = () => {
    clearAndroidTimers();
    lastProgressRef.current = Date.now();
    setVideoReady(true);
  };

  const startAndroidWatchdog = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    lastProgressRef.current = Date.now();
    androidWatchdogRef.current = setInterval(() => {
      if (Date.now() - lastProgressRef.current > 12000) {
        clearAndroidTimers();
        setVideoReady(false);
        setAndroidVideoKey((k) => k + 1);
        startAndroidFallbackRef.current?.();
      }
    }, 5000);
  }, [clearAndroidTimers]);

  const startAndroidFallbackRef = React.useRef<() => void>(null as any);
  const startAndroidFallback = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    clearAndroidTimers();
    startAndroidWatchdog();
    androidFallbackRef.current = setTimeout(() => setVideoReady(true), 6000);
    androidReconnectRef.current = setTimeout(() => {
      setVideoReady(false);
      setAndroidVideoKey((k) => k + 1);
      startAndroidFallbackRef.current?.();
    }, 20000);
  }, [clearAndroidTimers, startAndroidWatchdog]);

  React.useEffect(() => {
    startAndroidFallbackRef.current = startAndroidFallback;
  }, [startAndroidFallback]);

  const openFullscreen = React.useCallback(
    (item: any) => {
      setPendingThumbUrl(getCameraSnapshotUrl(item.iD_Camera_Ma, thumbTimestamp));
      setVideoReady(false);
      setAndroidVideoKey(0);
      setFullscreenCamera(item);
      Orientation.unlockAllOrientations();
      if (Platform.OS === "android") startAndroidFallback();
    },
    [startAndroidFallback, thumbTimestamp],
  );

  const numColumns = layoutCount === 1 ? 1 : 2;
  const itemWidth = screenWidth / numColumns - 16;
  const totalPages = Math.ceil(cameras.length / layoutCount);
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

  const changePage = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetLayout = (count: number) => {
    setLayoutCount(count);
    setPage(0);
    setShowLayoutModal(false);
  };

  const handleNavigate = () => {
    navigation.navigate("CameraListGrid", { cameras, zoneName });
  };

  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<any>) => {
      return (
        <View style={[styles.card, { width: itemWidth }]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <MaterialIcons name="videocam" size={16} color="#333" />
              <Text style={styles.cardTitle} numberOfLines={1}>
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
              <View style={[styles.preview, { backgroundColor: "#111" }]}>
                <ActivityIndicator size="small" color="#555" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [cameraToken, focusKey, itemWidth, openFullscreen, thumbTimestamp],
  );

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCamera
      ? getCameraSnapshotUrl(fullscreenCamera.iD_Camera_Ma, thumbTimestamp)
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
          const threshold = screenWidth * 0.3;
          if (e.translationX < -threshold && curPage < total - 1) {
            Animated.timing(translateX, {
              toValue: -screenWidth,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              changePage(curPage + 1);
            });
          } else if (e.translationX > threshold && curPage > 0) {
            Animated.timing(translateX, {
              toValue: screenWidth,
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
        }),
    [changePage, screenWidth, translateX],
  );

  const switchFullscreenCamera = React.useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      const nextCam = cameras[nextIndex];
      if (!nextCam) return;

      stopCameraWebView(fullscreenWebViewRef.current);
      clearAndroidTimers();

      setPendingThumbUrl(
        getCameraSnapshotUrl(nextCam.iD_Camera_Ma, thumbTimestamp),
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
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

      if (Platform.OS === "android") startAndroidFallback();
    },
    [
      cameras,
      clearAndroidTimers,
      fsTranslateX,
      layoutCount,
      screenWidth,
      startAndroidFallback,
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
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .numberOfTaps(2)
        .onEnd(closeFullscreen),
    [closeFullscreen],
  );
  const fullscreenGesture = React.useMemo(
    () =>
      Gesture.Simultaneous(fullscreenSwipeGesture, fullscreenDoubleTapGesture),
    [fullscreenDoubleTapGesture, fullscreenSwipeGesture],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>
          {zoneName} ({cameras.length} Camera)
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNavigate}>
            <Ionicons name="apps" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLayoutModal(true)}>
            <Ionicons name="grid" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <View style={styles.listArea}>
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
              removeClippedSubviews
              contentContainerStyle={styles.listContent}
              extraData={`${cameraToken}-${thumbTimestamp}-${focusKey}`}
            />
          </Animated.View>

          {totalPages > 1 && (
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

      {/* Layout Modal */}
      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setShowLayoutModal(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sheetContainer,
                { paddingBottom: insets.bottom || 16 },
              ]}
            >
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.sheetTitle}>Bố trí cửa sổ</Text>
              <Text style={styles.sheetTitleChild}>Chọn số lượng cửa sổ</Text>
              {["1", "4", "8", "12", "16"].map((item, index) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.listItem,
                    index !== 0 && styles.itemBorder,
                    layoutCount === Number(item) && styles.activeItem,
                  ]}
                  onPress={() => handleSetLayout(Number(item))}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      layoutCount === Number(item) && styles.activeText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowLayoutModal(false)}
              >
                <Text style={styles.closeText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreenCamera !== null}
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
        <View style={styles.fullscreenContainer}>
          <View
            style={[
              styles.fsHeader,
              isLandscape
                ? { paddingTop: 48, paddingLeft: insets.left || 16 }
                : { paddingTop: insets.top || 48 },
            ]}
          >
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={closeFullscreen}
            >
              <Ionicons name="chevron-down" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fsTitle} numberOfLines={1}>
              {fullscreenCamera?.iD_Camera_MoTa ?? "Camera"}
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
                {fullscreenCamera && cameraToken ? (
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
                          { opacity: videoReady ? 1 : 0 },
                        ]}
                        resizeMode="contain"
                        muted={isFullMuted}
                        repeat
                        controls={false}
                        useTextureView={false}
                        hideShutterView={true}
                        bufferConfig={{
                          minBufferMs: 1000,
                          maxBufferMs: 3000,
                          bufferForPlaybackMs: 500,
                          bufferForPlaybackAfterRebufferMs: 1000,
                        }}
                        onReadyForDisplay={handleAndroidReady}
                        onProgress={() =>
                          (lastProgressRef.current = Date.now())
                        }
                        onError={() => {
                          clearAndroidTimers();
                          androidReconnectRef.current = setTimeout(() => {
                            setVideoReady(false);
                            setAndroidVideoKey((k) => k + 1);
                            startAndroidFallback();
                          }, 3000);
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
                          { opacity: videoReady ? 1 : 0 },
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
                  </>
                ) : fullscreenCamera ? (
                  <ActivityIndicator
                    size="large"
                    color="#fff"
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
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

export default CameraList;

const styles = StyleSheet.create({
  container: { flex: 1 },
  listArea: { flex: 1, overflow: "hidden" },
  listAnimated: { flex: 1 },
  listContent: { paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
  },
  pageTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginRight: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 8,
    padding: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: { marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontSize: 12, marginLeft: 4, flex: 1 },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#000",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderRadius: 8,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  fullscreenContainer: { flex: 1, backgroundColor: "#000" },
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
  fsTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 4,
  },
  fsVideoArea: { flex: 1, backgroundColor: "#000" },
  fsPager: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  fsPagerText: { color: "#fff", fontSize: 14, fontWeight: "700" },
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
