import React, { memo, useRef, useState } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  TouchableOpacity,
} from "react-native";

import { getPreviewAttachProperty } from "../../services/data/callApi";
import { getMimeType } from "../../utils/Image";
import { error } from "../../utils/Logger";
import ImagePreviewModal from "./ImagePreviewModal";

type Props = {
  /** Bản thu nhỏ (`_Resize`) đã tải về, dạng data URL. */
  uri: string;
  /** Đường dẫn gốc trên máy chủ (`Property\abc.jpg`) để tải ảnh nét khi xem to. */
  originalPath: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/**
 * Ô ảnh của field `typeProperty = 9` (ảnh lưu trên máy chủ), bấm vào là xem to
 * như `Base64ImageThumb` của field base64. Mở ngay bằng bản thu nhỏ đang có rồi
 * thay bằng ảnh gốc khi tải xong; tải gốc lỗi thì xem tạm bản thu nhỏ.
 */
function PropertyImageThumb({
  uri,
  originalPath,
  style,
  accessibilityLabel = "Xem ảnh",
}: Props) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Ảnh gốc chỉ tải một lần, mở lại không gọi API nữa.
  const originalRef = useRef<string | null>(null);

  const open = () => {
    if (originalRef.current) {
      setPreviewUri(originalRef.current);
      return;
    }

    setPreviewUri(uri);
    getPreviewAttachProperty(originalPath)
      .then((res) => {
        const original = `data:${getMimeType(originalPath)};base64,${res.data}`;
        originalRef.current = original;
        // Đã đóng trước khi ảnh về thì đừng tự mở lại.
        setPreviewUri((prev) => (prev ? original : prev));
      })
      .catch((err) => error("Error fetching original image:", err));
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={open}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
      >
        <Image source={{ uri }} style={style} />
      </TouchableOpacity>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </>
  );
}

export default memo(PropertyImageThumb);
