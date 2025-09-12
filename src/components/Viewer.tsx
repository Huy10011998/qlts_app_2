// PdfViewer.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { getPreviewAttachFile } from "../services"; // giữ nguyên hàm của bạn

type ViewerProps = {
  visible: boolean;
  onClose: () => void;
  params: { name: string; path: string; nameClass: string };
};

export default function Viewer({ visible, onClose, params }: ViewerProps) {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useUrlFallback, setUseUrlFallback] = useState(false);

  const windowHeight = Dimensions.get("window").height;

  useEffect(() => {
    if (visible && params) fetchFile();
    else {
      setFileData(null);
      setFileType(null);
      setUseUrlFallback(false);
      setLoading(false);
    }
  }, [visible, params]);

  const fetchFile = async () => {
    try {
      setLoading(true);
      const { name, path, nameClass } = params;
      const ext = name.split(".").pop()?.toLowerCase() || "pdf";
      setFileType(ext);

      const { data } = await getPreviewAttachFile(name, path, nameClass);
      setFileData(data);
    } catch (err) {
      console.error("Fetch file error:", err);
      Alert.alert(
        "Lỗi",
        "Không thể tải file. Sử dụng fallback URL cho iOS Simulator."
      );
      setUseUrlFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const renderFile = () => {
    if (!fileType || !fileData) return null;

    // Hiển thị ảnh
    if (["png", "jpg", "jpeg"].includes(fileType)) {
      const uri = `data:image/${fileType};base64,${fileData}`;
      return (
        <Image
          source={{ uri }}
          style={{
            flex: 1,
            width: "100%",
            height: windowHeight,
            resizeMode: "contain",
          }}
        />
      );
    }

    // Hiển thị PDF
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
          <body style="margin:0;padding:0;">
            <embed width="100%" height="100%" src="data:application/pdf;base64,${fileData}" type="application/pdf" />
          </body>
        </html>
      `;
      return (
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, height: windowHeight }}
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
          <Text style={styles.title}>{params?.name || "File đính kèm"}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3333" />
          </View>
        ) : (
          renderFile()
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  closeButton: { padding: 6, borderRadius: 6 },
  closeText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
