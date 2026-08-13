import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ImageStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

import { getNoiDiaImageBase64 } from "../../../services/data/callApi";
import { warn } from "../../../utils/Logger";
import { useAppColors } from "../../../utils/helpers/colors";
import { getImageMimeType, toThumbnailPath } from "./noiDiaFormat";

/**
 * Ảnh nội địa tải qua `preview-attach-property` (không có URL công khai), nên
 * phải giữ dạng base64 trong state.
 *
 * `thumbnail`: dùng bản 40x40 server sinh sẵn — nhẹ hơn nhiều, đúng cho danh
 * sách; bấm vào mới tải ảnh gốc.
 */
const useNoiDiaImageSource = (filePath?: string | null, thumbnail = false) => {
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setSource(null);
      setHasError(true);
      return;
    }

    let isActive = true;
    const thumbnailPath = thumbnail ? toThumbnailPath(filePath) : "";

    setIsLoading(true);
    setHasError(false);

    // Đường dẫn thumbnail là do app tự suy ra theo quy tắc "_resize", không phải
    // BE trả về — bản resize thiếu thì lùi về ảnh gốc thay vì bỏ trống ô ảnh.
    const loadImage = async () => {
      if (thumbnailPath) {
        try {
          return await getNoiDiaImageBase64(thumbnailPath);
        } catch (err: any) {
          warn("[NoiDia] thiếu bản resize, dùng ảnh gốc", thumbnailPath, err?.message);
        }
      }

      return getNoiDiaImageBase64(filePath);
    };

    loadImage()
      .then((base64) => {
        if (!isActive) return;
        setSource(`data:${getImageMimeType(filePath)};base64,${base64}`);
      })
      .catch((err) => {
        if (!isActive) return;
        warn("[NoiDia] preview ảnh thất bại", filePath, err?.message);
        setHasError(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [filePath, thumbnail]);

  return { source, isLoading, hasError };
};

export function NoiDiaThumbnail({
  filePath,
  size = 56,
  onPress,
}: {
  filePath?: string | null;
  size?: number;
  onPress?: () => void;
}) {
  const c = useAppColors();
  const { source, isLoading, hasError } = useNoiDiaImageSource(filePath, true);

  const boxStyle: StyleProp<ImageStyle> = {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
  };

  return (
    <TouchableOpacity
      disabled={!onPress || !source}
      onPress={onPress}
      style={[styles.thumbnailBox, boxStyle]}
    >
      {source ? (
        <Image source={{ uri: source }} style={boxStyle} resizeMode="cover" />
      ) : isLoading ? (
        <ActivityIndicator size="small" color={c.red} />
      ) : (
        <Ionicons
          name={hasError ? "image-outline" : "hourglass-outline"}
          size={20}
          color={c.textMuted}
        />
      )}
    </TouchableOpacity>
  );
}

export function NoiDiaPhotoViewer({
  filePath,
  visible,
  onClose,
}: {
  filePath?: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { source, isLoading, hasError } = useNoiDiaImageSource(
    visible ? filePath : null,
  );

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.viewerRoot} onPress={onClose}>
        {source ? (
          <Image
            source={{ uri: source }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
        ) : isLoading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <Text style={styles.viewerError}>
            {hasError ? "Không tải được ảnh." : ""}
          </Text>
        )}

        <View style={[styles.viewerClose, { top: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  thumbnailBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewerRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerError: {
    color: "#fff",
    fontSize: 14,
  },
  viewerClose: {
    position: "absolute",
    right: 18,
  },
});
