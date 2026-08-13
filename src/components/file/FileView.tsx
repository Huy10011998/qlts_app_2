import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import type { ViewerProps } from "../../types/index";
import { getPreviewAttachFile } from "../../services";
import IsLoading from "../ui/IconLoading";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { buildPdfViewerHtml } from "./pdfViewerHtml";

export default function FileView({ visible, onClose, params }: ViewerProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useUrlFallback, setUseUrlFallback] = useState(false);

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
            <Image source={{ uri }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.stateText}>❌ Không tải được ảnh</Text>
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
            style={styles.webView}
          />
        );
      }

      return (
        <WebView
          originWhitelist={["*"]}
          source={{ html: buildPdfViewerHtml(fileData ?? "") }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.unsupportedContent}>
        <Text style={styles.stateText}>❌ Không hỗ trợ hiển thị file này</Text>
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
            <Text style={styles.closeText} allowFontScaling={false}>
              Đóng
            </Text>
          </TouchableOpacity>
        </View>

        {renderFile()}

        {loading && (
          <Animated.View
            style={[styles.loadingOverlay, { opacity: fadeAnim }]}
            pointerEvents="none"
          >
            <IsLoading size="large" color={c.red} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },

    header: {
      paddingTop: Platform.OS === "ios" ? 50 : 20,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: c.red,
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
      backgroundColor: c.loadingOverlay,
    },
    imageScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    imagePreview: {
      // Cao bằng vùng còn lại (màn trừ header), không phải cả chiều cao màn:
      // đặt cứng chiều cao màn thì ảnh tràn xuống dưới và lệch tâm dọc.
      flex: 1,
      width: "100%",
      resizeMode: "contain",
    },
    webView: {
      flex: 1,
    },
    unsupportedContent: {
      padding: 16,
    },
    stateText: {
      color: c.text,
    },
    titleWrap: {
      flex: 1,
      paddingRight: 10,
    },
  });
