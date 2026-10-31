import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import IsLoading from "../../../../components/ui/IconLoading";
import { cvLichSu } from "../../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../../services/data/workflowApi";
import type { CongViecItem, CongViecLichSu } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import { useWorkflowFileOpener } from "../../shared/useWorkflowFileOpener";
import { formatDayTime, parseBeDate } from "../../shared/workflowDate";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";
import LichSuTimeline from "./LichSuTimeline";

/** Loại mốc "Gia hạn" của cv-lich-su. */
const LOAI_GIA_HAN = 3;

export type LichSuSheetMode = "lichSu" | "giaHan";

type Props = {
  /** Việc + phần muốn xem; null = đóng. */
  target: { item: CongViecItem; mode: LichSuSheetMode } | null;
  onClose: () => void;
};

/**
 * Bấm icon Lịch sử / Gia hạn ở chân việc trên Lịch: xem ngay trong sheet, khỏi
 * vào chi tiết. Gia hạn = hạn ban đầu → hạn hiện tại + các mốc gia hạn (ghi
 * chú, file) lọc từ cùng cv-lich-su.
 */
export default function CongViecLichSuSheet({ target, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const fileOpener = useWorkflowFileOpener();
  const [items, setItems] = useState<CongViecLichSu[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Giữ nội dung lúc sheet đang trượt xuống.
  const lastTargetRef = useRef(target);
  if (target) lastTargetRef.current = target;
  const current = target ?? lastTargetRef.current;
  const id = target?.item.id;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setItems(null);
    setErrorMessage(null);
    cvLichSu(id)
      .then((rows) => active && setItems(rows))
      .catch((err) => {
        if (active) setErrorMessage(getWorkflowErrorMessage(err, "Không tải được lịch sử."));
      });
    return () => {
      active = false;
    };
  }, [id, retryKey]);

  if (!current) return null;

  const { item, mode } = current;
  const isGiaHan = mode === "giaHan";
  const shown = isGiaHan ? items?.filter((row) => row.loai === LOAI_GIA_HAN) : items;
  const title = `${isGiaHan ? "Gia hạn" : "Lịch sử"}${
    item.soCongViec ? ` · ${item.soCongViec}` : ""
  }`;

  return (
    <WorkflowSheet
      visible={!!target}
      title={title}
      onClose={onClose}
      overlay={
        <>
          {fileOpener.viewer}
          {fileOpener.opening ? <IsLoading style={styles.overlay} /> : null}
        </>
      }
    >
      {item.tieuDe ? (
        <Text style={styles.taskTitle} numberOfLines={2}>
          {item.tieuDe}
        </Text>
      ) : null}

      {isGiaHan ? (
        <View style={styles.hanBox}>
          <View style={styles.hanRow}>
            <Text style={styles.hanLabel}>Hạn ban đầu</Text>
            <Text style={styles.hanValue}>{formatDayTime(parseBeDate(item.hanBanDau))}</Text>
          </View>
          <View style={styles.hanRow}>
            <Text style={styles.hanLabel}>Hạn hiện tại</Text>
            <Text style={[styles.hanValue, styles.hanValueNew]}>
              {formatDayTime(parseBeDate(item.denNgay))}
            </Text>
          </View>
        </View>
      ) : null}

      {shown ? (
        isGiaHan && !shown.length ? (
          <Text style={styles.empty}>Chưa có mốc gia hạn.</Text>
        ) : (
          <LichSuTimeline
            items={shown}
            onOpenFile={(file) => fileOpener.openFile(CV_CONG_VIEC_NAME_CLASS, file)}
          />
        )
      ) : errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.empty}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setRetryKey((key) => key + 1)} hitSlop={8}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={c.red} />
        </View>
      )}
    </WorkflowSheet>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    taskTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSecondary,
      marginBottom: 12,
    },
    hanBox: {
      gap: 6,
      padding: 12,
      marginBottom: 14,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
    },
    hanRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    hanLabel: {
      fontSize: 13,
      color: c.textSub,
    },
    hanValue: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    hanValueNew: {
      color: "#fb8c00",
    },
    loading: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
    },
    errorBox: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 20,
    },
    empty: {
      fontSize: 14,
      color: c.textSub,
      textAlign: "center",
    },
    retryText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.loadingOverlay,
    },
  });
