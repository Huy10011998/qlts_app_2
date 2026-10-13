import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNFS from "react-native-fs";

import { viewWorkflowFile } from "../../../../services/data/workflowApi";
import type { WorkflowApiBase } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { warn } from "../../../../utils/Logger";
import { getFileExtension } from "../workflowAttachments";

type Props = {
  apiBase: WorkflowApiBase;
  fileId: number;
  name?: string | null;
  /** Bấm ảnh — thường là mở xem toàn màn. */
  onPress: () => void;
  width?: number;
};

/** Ảnh dọc / ngang quá đà thì cắt bớt cho bong bóng chat không quá cao / quá dẹt. */
const MIN_RATIO = 0.6;
const MAX_RATIO = 1.8;

const cachePath = (apiBase: string, fileId: number, name?: string | null) =>
  `${RNFS.CachesDirectoryPath}/wf_${apiBase}_${fileId}.${getFileExtension(name) || "jpg"}`;

/**
 * Ảnh đính kèm hiện thẳng (như ảnh trong chat) thay cho dòng tên file. Tải 1
 * lần qua flow-xem-file rồi ghi vào bộ nhớ đệm — mở lại màn không tải nữa (file
 * đã gửi không sửa được nên khoá theo id là đủ). Lỗi thì hiện dòng bấm để mở.
 */
export default function WorkflowFileImage({ apiBase, fileId, name, onPress, width = 240 }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);

  useEffect(() => {
    let alive = true;
    const path = cachePath(apiBase, fileId, name);

    (async () => {
      try {
        if (!(await RNFS.exists(path))) {
          const { base64 } = await viewWorkflowFile(apiBase, fileId);
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
  }, [apiBase, fileId, name]);

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
      style={[styles.frame, { width, aspectRatio: ratio }]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={(event) => {
            const { width: w, height: h } = event.nativeEvent.source;
            if (w && h) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h)));
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={c.textSub} />
        </View>
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
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
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
