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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableWithoutFeedback } from "react-native";
import { useNavigation } from "@react-navigation/native";

const GO2RTC_HOST = "http://192.168.100.13:8859";
const SCREEN_WIDTH = Dimensions.get("window").width;

const buildStreamHTML = (src: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <video id="video" autoplay muted playsinline></video>
  <script>
    const video = document.getElementById('video');
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (e) => {
      video.srcObject = e.streams[0];
      video.play().catch(() => {});
    };

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    async function start() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Chờ ICE candidates gather xong
      await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve(null);
        } else {
          pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') resolve(null);
          });
          setTimeout(resolve, 3000);
        }
      });

      const response = await fetch('${GO2RTC_HOST}/api/webrtc?src=${src}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp
      });

      const sdp = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp });
    }

    start().catch(console.error);
  </script>
</body>
</html>
`;

const CameraList: React.FC = () => {
  const route = useRoute<any>();
  const { cameras, zoneName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [layoutCount, setLayoutCount] = React.useState<number>(4);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [fullscreenCamera, setFullscreenCamera] = React.useState<any | null>(
    null,
  );
  const [page, setPage] = React.useState(0);

  const totalCameras = cameras.length;

  const getNumColumns = () => {
    if (layoutCount === 1) return 1;
    if (layoutCount === 4) return 2;
    if (layoutCount === 9) return 3;
    if (layoutCount === 12) return 3;
    if (layoutCount === 16) return 4;
    return 2;
  };

  const numColumns = getNumColumns();
  const itemWidth = SCREEN_WIDTH / numColumns - 16;
  const totalPages = Math.ceil(totalCameras / layoutCount);
  const pagedCameras = cameras.slice(
    page * layoutCount,
    (page + 1) * layoutCount,
  );

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
      const frameUrl = `${GO2RTC_HOST}/api/frame.jpeg?src=${item.iD_Camera_Ma}_snap`;

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
            onPress={() => setFullscreenCamera(item)}
            style={styles.videoWrapper}
          >
            <Image
              source={{ uri: frameUrl, cache: "reload" }}
              style={styles.preview}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      );
    },
    [itemWidth],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>
          {zoneName} ({totalCameras} Camera)
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

      <FlatList
        data={pagedCameras}
        key={`${numColumns}-${page}`}
        numColumns={numColumns}
        keyExtractor={(item) => item.iD_Camera.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => setPage((p) => p - 1)}
            disabled={page === 0}
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={page === 0 ? "#ccc" : "#333"}
            />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page + 1} / {totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => setPage((p) => p + 1)}
            disabled={page === totalPages - 1}
            style={[
              styles.pageBtn,
              page === totalPages - 1 && styles.pageBtnDisabled,
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={page === totalPages - 1 ? "#ccc" : "#333"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal chọn layout */}
      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
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

              {["1", "4", "9", "12", "16"].map((item, index) => (
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

      {/* Modal Fullscreen Camera */}
      <Modal
        visible={fullscreenCamera !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setFullscreenCamera(null)}
      >
        <View
          style={[styles.fullscreenContainer, { paddingBottom: insets.bottom }]}
        >
          {/* Header */}
          <View
            style={[styles.fullscreenHeader, { paddingTop: insets.top || 48 }]}
          >
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {fullscreenCamera?.iD_Camera_MoTa}
            </Text>
            <TouchableOpacity onPress={() => setFullscreenCamera(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* WebView load thẳng go2rtc stream.html — có đầy đủ UI controls */}
          {fullscreenCamera && (
            <WebView
              source={{
                html: buildStreamHTML(fullscreenCamera.iD_Camera_Ma),
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
              allowsFullscreenVideo
              javaScriptCanOpenWindowsAutomatically
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default CameraList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

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

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 8,
    padding: 6,
    elevation: 2,
    overflow: "hidden",
  },

  cardHeader: {
    marginBottom: 4,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },

  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },

  webview: {
    flex: 1,
    backgroundColor: "#000",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#eee",
    gap: 16,
  },

  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  pageBtnDisabled: {
    backgroundColor: "#f0f0f0",
    elevation: 0,
  },

  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    minWidth: 60,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  activeText: {
    color: "red",
    fontWeight: "600",
  },

  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: "85%",
  },

  handleWrapper: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },

  handle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },

  sheetTitleChild: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: "#aaa",
  },

  listItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },

  itemBorder: {
    borderTopWidth: 0.5,
    borderColor: "#e5e5e5",
  },

  listItemText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },

  closeBtn: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  closeText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  activeItem: {
    backgroundColor: "#f5f5f5",
  },

  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  fullscreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  fullscreenTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },

  preview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#000",
  },
});
