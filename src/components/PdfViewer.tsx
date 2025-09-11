import React, { useEffect, useState } from "react";
import {
  View,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { getPreviewAttachFile } from "@/services";
import { WebView } from "react-native-webview";

type ViewerProps = {
  visible: boolean;
  onClose: () => void;
  params: { name: string; path: string; nameCLass: string };
};

export default function Viewer({ visible, onClose, params }: ViewerProps) {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && params) fetchFile();
    else {
      setFileData(null);
      setFileType(null);
    }
  }, [visible, params]);

  const fetchFile = async () => {
    try {
      setLoading(true);
      const { name, path, nameCLass } = params;

      const { headers, data } = await getPreviewAttachFile(
        name,
        path,
        nameCLass
      );

      let fileName = name;
      const contentDisposition = headers["content-disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename\*?=['"]?UTF-8''(.+?)['"]?$/i
        );
        if (match && match[1]) fileName = decodeURIComponent(match[1]);
      }

      const ext = fileName.split(".").pop()?.toLowerCase() || null;
      setFileType(ext);
      setFileData(data);
    } catch (err) {
      console.error("Fetch file error:", err);
      Alert.alert("Lỗi", "Không thể tải file.");
    } finally {
      setLoading(false);
    }
  };

  const renderFile = () => {
    const windowHeight = Dimensions.get("window").height;

    if (!fileType || !fileData) return null;

    // Ảnh
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

    // PDF
    if (fileType === "pdf") {
      const html = `
        <html>
          <body style="margin:0;padding:0;">
            <div style="height:100%; width:100%; overflow: auto;">
              <embed width="100%" src="data:application/pdf;base64,${fileData}" type="application/pdf" />
            </div>
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
        <Text>Không hỗ trợ hiển thị file này</Text>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {/* Nội dung file */}
          {loading ? (
            <ActivityIndicator size="large" style={{ flex: 1 }} />
          ) : (
            renderFile()
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FF3333",
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  closeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
