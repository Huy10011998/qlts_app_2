import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import { getPreviewAttachFile } from "../services";
import { ViewerProps } from "../types";
import IsLoading from "./ui/IconLoading";

export default function FileViewer({ visible, onClose, params }: ViewerProps) {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useUrlFallback, setUseUrlFallback] = useState(false);

  const windowHeight = Dimensions.get("window").height;

  // animation opacity
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
  }, [visible, params]);

  const fetchFile = async () => {
    try {
      setLoading(true);
      fadeIn();
      const { name, path, nameClass } = params;
      const ext = name.split(".").pop()?.toLowerCase() || "pdf";
      setFileType(ext);

      const { data } = await getPreviewAttachFile(name, path, nameClass);
      setFileData(data);
    } catch (err) {
      console.error("Fetch file error:", err);
      Alert.alert("Lỗi", "Không thể tải file. Sử dụng fallback URL cho PDF.");
      setUseUrlFallback(true);
    } finally {
      fadeOut();
    }
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setLoading(false));
  };

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
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={{
                width: "100%",
                height: windowHeight,
                resizeMode: "contain",
              }}
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
            style={{ flex: 1, height: windowHeight }}
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
          style={{ flex: 1, height: windowHeight }}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text>❌ Không hỗ trợ hiển thị file này</Text>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="middle">
              {params?.name || "File đính kèm"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </View>

        {renderFile()}

        {/* overlay loading */}
        {loading && (
          <Animated.View
            style={[styles.loadingOverlay, { opacity: fadeAnim }]}
            pointerEvents="none"
          >
            <IsLoading />
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
    backgroundColor: "#FF3333",
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
});
