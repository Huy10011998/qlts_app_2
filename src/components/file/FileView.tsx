import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import { ViewerProps } from "../../types/Index";
import { getPreviewAttachFile } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { C } from "../../utils/helpers/colors";

export default function FileView({ visible, onClose, params }: ViewerProps) {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useUrlFallback, setUseUrlFallback] = useState(false);

  const windowHeight = Dimensions.get("window").height;
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fadeOut = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (isMounted()) {
        setLoading(false);
      }
    });
  }, [fadeAnim, isMounted]);

  const fetchFile = useCallback(async () => {
    if (!params) return;

    try {
      setLoading(true);
      fadeIn();
      const { name, path, nameClass } = params;
      const ext = name.split(".").pop()?.toLowerCase() || "pdf";
      setFileType(ext);

      const { data } = await getPreviewAttachFile(name, path, nameClass);
      setFileData(data);
    } catch (err) {
      error("Fetch file error:", err);
      showAlertIfActive(
        "Lỗi",
        "Không thể tải file. Sử dụng fallback URL cho PDF.",
      );
      if (isMounted()) {
        setUseUrlFallback(true);
      }
    } finally {
      fadeOut();
    }
  }, [fadeIn, fadeOut, isMounted, params, showAlertIfActive]);

  useEffect(() => {
    if (visible && params) {
      fetchFile();
    } else {
      setFileData(null);
      setFileType(null);
      setUseUrlFallback(false);
      setLoading(false);
      fadeAnim.setValue(0);
    }
  }, [fadeAnim, fetchFile, params, visible]);

  const renderFile = () => {
    if (!fileType || (!fileData && !useUrlFallback)) return null;

    if (["png", "jpg", "jpeg"].includes(fileType)) {
      const uri = fileData
        ? `data:image/${fileType};base64,${fileData}`
        : undefined;
      return (
        <ScrollView
          maximumZoomScale={5}
          minimumZoomScale={1}
          contentContainerStyle={styles.imageScrollContent}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={[styles.imagePreview, { height: windowHeight }]}
            />
          ) : (
            <Text>❌ Không tải được ảnh</Text>
          )}
        </ScrollView>
      );
    }

    if (fileType === "pdf") {
      if (useUrlFallback) {
        const pdfUrl = `${params.nameClass}/preview-attach-file?name=${params.name}`;
        return (
          <WebView
            originWhitelist={["*"]}
            source={{ uri: pdfUrl }}
            style={[styles.webView, { height: windowHeight }]}
          />
        );
      }

      const html = `
        <html>
          <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js"></script>
            <style>
              body { margin:0; padding:0; }
              canvas { display:block; margin:16px auto; border:1px solid #ccc; }
            </style>
          </head>
          <body>
            <div id="container"></div>
            <script>
              const pdfData = "${fileData}";
              const pdfjsLib = window['pdfjs-dist/build/pdf'];
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
              const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData) });
              loadingTask.promise.then(pdf => {
                for(let pageNum=1; pageNum <= pdf.numPages; pageNum++){
                  pdf.getPage(pageNum).then(page=>{
                    const scale = 1.5;
                    const viewport = page.getViewport({scale});
                    const canvas = document.createElement('canvas');
                    document.getElementById('container').appendChild(canvas);
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    page.render({canvasContext: context, viewport: viewport});
                  });
                }
              });
            </script>
          </body>
        </html>
      `;
      return (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={[styles.webView, { height: windowHeight }]}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.unsupportedContent}>
        <Text>❌ Không hỗ trợ hiển thị file này</Text>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="middle">
              {params?.name || "File đính kèm"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </View>

        {renderFile()}

        {loading && (
          <Animated.View
            style={[styles.loadingOverlay, { opacity: fadeAnim }]}
            pointerEvents="none"
          >
            <IsLoading size="large" color={C.red} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.red,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },

  closeButton: { padding: 6, borderRadius: 6 },
  closeText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  imageScrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    resizeMode: "contain",
  },
  webView: {
    flex: 1,
  },
  unsupportedContent: {
    padding: 16,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 10,
  },
});
