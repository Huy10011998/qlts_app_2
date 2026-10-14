import React, { useEffect, useState } from "react";
import { Image, PixelRatio, StyleSheet, Text, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNFS from "react-native-fs";

import { SkeletonFill } from "../../../../components/ui/SkeletonBlock";
import { viewWorkflowFile } from "../../../../services/data/workflowApi";
import type { WorkflowApiBase } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { warn } from "../../../../utils/Logger";
import { getThumbnailSize } from "../../Common/realtimeCommentRules";
import { getFileExtension } from "../workflowAttachments";

type Props = {
  apiBase: WorkflowApiBase;
  fileId: number;
  name?: string | null;
  /** Bấm ảnh — thường là mở xem toàn màn. */
  onPress: () => void;
  /** Chưa tải ảnh (vd màn còn đang nhảy xuống tin cuối) — khung chờ vẫn đủ cỡ. */
  defer?: boolean;
};

/**
 * Khung ảnh CAO CỐ ĐỊNH như web (7-Mobile-Realtime-BinhLuan mục 5): ảnh nạp sau
 * chỉ đổi bề ngang, không đẩy nội dung lên / xuống. Rộng theo tỉ lệ, tối đa 280.
 */
const FRAME_HEIGHT = 180;
const MAX_WIDTH = 280;
/** Ảnh dọc quá đà thì cắt bớt cho khung không quá hẹp. */
const MIN_RATIO = 0.6;
/** Chưa biết tỉ lệ: khung chờ 4:3 (240 × 180). */
const PLACEHOLDER_RATIO = 4 / 3;

/** Ảnh thu nhỏ: JPEG giữ JPEG, còn lại server trả PNG. Khoá theo id + cỡ xin. */
const cachePath = (apiBase: string, fileId: number, thuNho: number, name?: string | null) => {
  const ext = /^jpe?g$/i.test(getFileExtension(name) ?? "") ? "jpg" : "png";
  return `${RNFS.CachesDirectoryPath}/wf_${apiBase}_${fileId}_t${thuNho}.${ext}`;
};

/**
 * Ảnh đính kèm hiện thẳng (như ảnh trong chat) thay cho dòng tên file. Xin ẢNH
 * THU NHỎ qua flow-xem-file + ThuNho (gấp mật độ điểm ảnh của màn — 7-Mobile-
 * Realtime-BinhLuan mục 5) rồi ghi vào bộ nhớ đệm; bấm ảnh mới tải file gốc.
 * File bình luận không sửa được nên khoá theo id là đủ. Lỗi thì hiện dòng bấm để mở.
 */
export default function WorkflowFileImage({ apiBase, fileId, name, onPress, defer = false }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState(PLACEHOLDER_RATIO);
  const width = Math.min(MAX_WIDTH, Math.round(FRAME_HEIGHT * ratio));

  useEffect(() => {
    if (defer) return;
    let alive = true;
    // Cạnh dài tối đa đang hiện là bề ngang tối đa của khung.
    const thuNho = getThumbnailSize(MAX_WIDTH, PixelRatio.get());
    const path = cachePath(apiBase, fileId, thuNho, name);

    (async () => {
      try {
        if (!(await RNFS.exists(path))) {
          const { base64 } = await viewWorkflowFile(apiBase, fileId, thuNho);
          await RNFS.writeFile(path, base64, "base64");
        }
        if (alive) setUri(`file://${path}`);
      } catch (err) {
        warn("[WorkflowFileImage] load error", err);
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [apiBase, defer, fileId, name]);

  if (failed) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.fallback, { width }]}>
        <Ionicons name="image-outline" size={16} color={c.textSub} />
        <Text style={styles.fallbackText} numberOfLines={1}>
          Không tải được ảnh — bấm để mở
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!uri}
      accessibilityRole="imagebutton"
      accessibilityLabel={name ?? "Ảnh đính kèm"}
      style={[styles.frame, { width, height: FRAME_HEIGHT }]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={(event) => {
            const { width: w, height: h } = event.nativeEvent.source;
            if (w && h) setRatio(Math.max(MIN_RATIO, w / h));
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <SkeletonFill />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    frame: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    fallback: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    fallbackText: {
      flexShrink: 1,
      fontSize: 13,
      color: c.textSub,
    },
  });
