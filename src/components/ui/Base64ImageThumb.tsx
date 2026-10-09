import React, { memo, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { isDataUrlImage } from "../../utils/imageBase64";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import ImagePreviewModal from "./ImagePreviewModal";

type Props = {
  /** Giá trị field `typeProperty = 12`: data URL đầy đủ, hoặc rỗng. */
  value?: string | null;
  size?: number;
  /** Mặc định bấm vào là xem to; tắt đi khi ô đã nằm trong một nút khác. */
  previewable?: boolean;
  accessibilityLabel?: string;
};

/**
 * Ô vuông hiện ảnh base64 của field `typeProperty = 12`, ảnh fill kín ô (cắt
 * viền chứ không méo) như lưới web. `Image` giải mã data URL tại chỗ — không ghi
 * file, không gọi API. Bọc `memo` để cuộn danh sách không giải mã lại.
 *
 * Giá trị rỗng hoặc không bắt đầu bằng `data:` (dữ liệu lỗi) → icon "không có ảnh".
 */
function Base64ImageThumb({
  value,
  size = 40,
  previewable = true,
  accessibilityLabel = "Xem ảnh",
}: Props) {
  const s = useStyles(makeStyles);
  const c = useAppColors();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Nhớ chuỗi hỏng chứ không nhớ cờ: đổi sang ảnh khác thì thử hiện lại.
  const [brokenValue, setBrokenValue] = useState<string | null>(null);

  const box = { width: size, height: size, borderRadius: size >= 60 ? 10 : 6 };
  const hasImage = isDataUrlImage(value) && brokenValue !== value;

  if (!hasImage) {
    return (
      <View style={[s.box, s.empty, box]}>
        <Ionicons
          name="image-outline"
          size={Math.max(14, size * 0.45)}
          color={c.textMuted}
        />
      </View>
    );
  }

  const image = (
    <Image
      source={{ uri: value }}
      style={[s.box, box]}
      resizeMode="cover"
      onError={() => setBrokenValue(value)}
    />
  );

  if (!previewable) return image;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPreviewUri(value)}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
      >
        {image}
      </TouchableOpacity>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </>
  );
}

export default memo(Base64ImageThumb);

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    box: { backgroundColor: c.border, overflow: "hidden" },
    empty: { alignItems: "center", justifyContent: "center" },
  });
