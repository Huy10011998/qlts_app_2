import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Orientation from "react-native-orientation-locker";

const GO2RTC_HOST = "http://192.168.100.13:8859";

const LAYOUT_OPTIONS: Record<number, [number, number]> = {
  1: [1, 1],
  4: [2, 2],
  9: [3, 3],
  16: [4, 4],
};

const buildStreamHTML = (src: string) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
video{width:100%;height:100%;object-fit:cover}
</style></head><body>
<video id="v" autoplay muted playsinline></video>
<script>
const v=document.getElementById('v');
const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
pc.ontrack=e=>{v.srcObject=e.streams[0];v.play().catch(()=>{})};
pc.addTransceiver('video',{direction:'recvonly'});
pc.addTransceiver('audio',{direction:'recvonly'});
async function start(){
  const offer=await pc.createOffer();
  await pc.setLocalDescription(offer);
  const r=await fetch('${GO2RTC_HOST}/api/webrtc?src=${src}_sub',{
    method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp
  });
  await pc.setRemoteDescription({type:'answer',sdp:await r.text()});
}
start().catch(console.error);
</script></body></html>`;

const buildFullStreamHTML = (src: string) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
video{width:100%;height:100%;object-fit:contain}
</style></head><body>
<video id="v" autoplay muted playsinline></video>
<script>
const v=document.getElementById('v');
const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
pc.ontrack=e=>{v.srcObject=e.streams[0];v.play().catch(()=>{})};
pc.addTransceiver('video',{direction:'recvonly'});
pc.addTransceiver('audio',{direction:'recvonly'});
async function start(){
  const offer=await pc.createOffer();
  await pc.setLocalDescription(offer);
  const r=await fetch('${GO2RTC_HOST}/api/webrtc?src=${src}',{
    method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp
  });
  await pc.setRemoteDescription({type:'answer',sdp:await r.text()});
}
start().catch(console.error);
</script></body></html>`;

const CameraListGrid: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { cameras = [], zoneName = "Camera" } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const [layoutCount, setLayoutCount] = React.useState(16);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = React.useState(false);
  const [gridContainerH, setGridContainerH] = React.useState(0);
  const [fullscreenCam, setFullscreenCam] = React.useState<any | null>(null);
  const [isFullMuted, setIsFullMuted] = React.useState(false);

  // Track screen dimensions (thay đổi khi xoay)
  const [screenDims, setScreenDims] = React.useState(Dimensions.get("window"));
  const isLandscape = screenDims.width > screenDims.height;

  const translateX = React.useRef(new Animated.Value(0)).current;
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);

  const SW = screenDims.width;

  const [cols, rows] = LAYOUT_OPTIONS[layoutCount] ?? [4, 4];
  const perPage = cols * rows;
  const totalPages = Math.ceil(cameras.length / perPage);
  const pagedCameras = cameras.slice(page * perPage, (page + 1) * perPage);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);
  React.useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  // Lắng nghe thay đổi dimension khi xoay màn hình
  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenDims(window);
    });
    return () => sub?.remove();
  }, []);

  // Khi mở fullscreen: unlock orientation để tự do xoay
  // Khi đóng fullscreen: lock lại portrait
  React.useEffect(() => {
    if (fullscreenCam) {
      Orientation.unlockAllOrientations();
    } else {
      Orientation.lockToPortrait();
    }
  }, [fullscreenCam]);

  // Khi vào fullscreen → dừng grid để tiết kiệm tài nguyên, tránh WebView bị reload khi xoay
  React.useEffect(() => {
    if (fullscreenCam) {
      setIsPaused(true); // Mở fullscreen → dừng grid
    } else {
      setIsPaused(false); // Đóng fullscreen → chạy lại grid
    }
  }, [fullscreenCam]);

  // Lock portrait khi vào màn hình, unlock khi rời
  React.useEffect(() => {
    Orientation.lockToPortrait();
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      Orientation.unlockAllOrientations();
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  const cellW = SW / cols;
  const cellH =
    gridContainerH > 0 ? gridContainerH / rows : SW / cols / (16 / 9);

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
        }).start(() => {
          setPage((p) => p + 1);
          translateX.setValue(0);
        });
      } else if (e.translationX > THRESHOLD && curPage > 0) {
        Animated.timing(translateX, {
          toValue: SW,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setPage((p) => p - 1);
          translateX.setValue(0);
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
    setLayoutCount(count);
    setPage(0);
    setActiveIndex(0);
    setShowLayoutPicker(false);
  };

  const lastTapRef = React.useRef<{ [key: string]: number }>({});

  const handleCamPress = (cam: any, idx: number) => {
    setActiveIndex(idx);
    const now = Date.now();
    const key = cam.iD_Camera?.toString() ?? idx.toString();
    const lastTap = lastTapRef.current[key] ?? 0;

    if (now - lastTap < 300) {
      // Double tap → mở fullscreen
      setFullscreenCam(cam);
      lastTapRef.current[key] = 0;
    } else {
      // Single tap → chỉ set active
      lastTapRef.current[key] = now;
    }
  };

  const handleFullscreenPrev = () => {
    if (!fullscreenCam) return;
    const idx = pagedCameras.findIndex(
      (c: any) => c.iD_Camera === fullscreenCam.iD_Camera,
    );
    if (idx > 0) {
      setFullscreenCam(pagedCameras[idx - 1]);
      setActiveIndex(idx - 1);
    }
  };

  const handleFullscreenNext = () => {
    if (!fullscreenCam) return;
    const idx = pagedCameras.findIndex(
      (c: any) => c.iD_Camera === fullscreenCam.iD_Camera,
    );
    if (idx < pagedCameras.length - 1) {
      setFullscreenCam(pagedCameras[idx + 1]);
      setActiveIndex(idx + 1);
    }
  };

  const closeFullscreen = () => {
    setFullscreenCam(null);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ── TOP HALF ── */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.topHalf}>
          <Animated.View
            style={[styles.grid, { transform: [{ translateX }] }]}
            onLayout={(e) => setGridContainerH(e.nativeEvent.layout.height)}
          >
            {pagedCameras.map((cam: any, idx: number) => {
              const isActive = idx === activeIndex;
              return (
                <TouchableOpacity
                  key={cam.iD_Camera?.toString() ?? idx.toString()}
                  activeOpacity={0.85}
                  onPress={() => handleCamPress(cam, idx)}
                  style={[styles.cell, { width: cellW, height: cellH }]}
                >
                  {!isPaused && !fullscreenCam && (
                    <WebView
                      source={{
                        html: buildStreamHTML(cam.iD_Camera_Ma),
                        baseUrl: GO2RTC_HOST,
                      }}
                      style={StyleSheet.absoluteFill}
                      javaScriptEnabled
                      domStorageEnabled
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      cacheEnabled={false}
                      androidLayerType="hardware"
                      mixedContentMode="always"
                      originWhitelist={["*"]}
                      allowFileAccess
                      allowUniversalAccessFromFileURLs
                      scrollEnabled={false}
                    />
                  )}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <View style={styles.cellTop}>
                      {isActive && (
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
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          <View style={styles.paginationRow}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setPage(i)}>
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GestureDetector>

      {/* ── BOTTOM HALF ── */}
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
              color="#444"
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
          <TouchableOpacity style={styles.toolBtn}>
            <MaterialCommunityIcons name="overscan" size={26} color="#444" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.playbackBtn}>
            <Ionicons name="play" size={16} color="#e53935" />
            <Text style={styles.playbackText}>Phát lại</Text>
          </TouchableOpacity>
          <View style={styles.iconGroup}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="camera-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="radio-button-on-outline" size={24} color="#666" />
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

      {/* ── LAYOUT PICKER ── */}
      {showLayoutPicker && (
        <View style={styles.layoutPicker}>
          {[1, 4, 9, 16].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.layoutOption,
                layoutCount === n && styles.layoutOptionActive,
              ]}
              onPress={() => handleSetLayout(n)}
            >
              <Text
                style={[
                  styles.layoutOptionText,
                  layoutCount === n && styles.layoutOptionTextActive,
                ]}
              >
                {n === 1 ? "1×1" : n === 4 ? "2×2" : n === 9 ? "3×3" : "4×4"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── FULLSCREEN MODAL ── */}
      <Modal
        visible={fullscreenCam !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fsContainer}>
          {/* Header overlay */}
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

            {/* Nút xoay màn hình thủ công */}
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={() => {
                if (isLandscape) {
                  Orientation.lockToPortrait();
                } else {
                  Orientation.lockToLandscapeLeft();
                }
              }}
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

          {/* WebRTC Stream */}
          {fullscreenCam && (
            <WebView
              source={{
                html: buildFullStreamHTML(fullscreenCam.iD_Camera_Ma),
                baseUrl: GO2RTC_HOST,
              }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled={false}
              androidLayerType="hardware"
              mixedContentMode="always"
              originWhitelist={["*"]}
              allowFileAccess
              allowUniversalAccessFromFileURLs
            />
          )}

          {/* Footer overlay */}
          <View
            style={[
              styles.fsFooter,
              isLandscape
                ? { paddingBottom: 12, paddingRight: insets.right || 16 }
                : { paddingBottom: insets.bottom || 34 },
            ]}
          >
            <TouchableOpacity
              style={styles.fsNavBtn}
              onPress={handleFullscreenPrev}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
              <Text style={styles.fsNavText}>Trước</Text>
            </TouchableOpacity>

            <View style={styles.fsLiveBadge}>
              <View style={styles.fsLiveDot} />
              <Text style={styles.fsLiveText}>Trực tiếp</Text>
            </View>

            <TouchableOpacity
              style={styles.fsNavBtn}
              onPress={handleFullscreenNext}
            >
              <Text style={styles.fsNavText}>Tiếp</Text>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

export default CameraListGrid;

const styles = StyleSheet.create({
  root: { flex: 1 },

  topHalf: { flex: 5, backgroundColor: "#000", overflow: "hidden" },

  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },

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

  cellBottom: {
    marginTop: "auto" as any,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },

  cellLabel: { color: "#fff", fontSize: 8 },

  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 28,
    backgroundColor: "#fff",
    gap: 4,
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

  playbackText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  iconGroup: { flex: 1, flexDirection: "row", justifyContent: "space-between" },

  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  chevronWrapper: { alignItems: "center", paddingBottom: 8 },

  layoutPicker: {
    position: "absolute",
    bottom: 120,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },

  layoutOption: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },

  layoutOptionActive: { backgroundColor: "#fff5f5" },
  layoutOptionText: { color: "#555", fontSize: 15, textAlign: "center" },
  layoutOptionTextActive: { color: "#e53935", fontWeight: "700" },

  // ── FULLSCREEN
  fsContainer: { flex: 1 },

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

  fsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  fsNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  fsNavText: { color: "#fff", fontSize: 14, fontWeight: "500" },

  fsLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.9)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },

  fsLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },

  fsLiveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
