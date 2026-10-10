import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { CongViecLichSu, WorkflowFileItem } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import WorkflowFileRow from "../../shared/components/WorkflowFileRow";
import { formatFileSizeKb } from "../../shared/workflowAttachments";
import {
  CV_LICH_SU_LOAI,
  getCongViecTrangThai,
} from "../../shared/workflowConstants";
import { formatBeDate } from "../../shared/workflowDate";

type Props = {
  items: CongViecLichSu[];
  onOpenFile: (file: WorkflowFileItem) => void;
};

const MAU_MAC_DINH = "#9da5b1";

/** Câu mô tả một mốc theo loại (mục 7). */
const describe = (item: CongViecLichSu) => {
  const trangThaiCu = getCongViecTrangThai(item.trangThaiCu)?.label ?? "";
  const trangThaiMoi = getCongViecTrangThai(item.trangThaiMoi)?.label ?? "";

  switch (item.loai) {
    case 1:
      return `Trạng thái: Mới · hạn ${formatBeDate(item.denNgayMoi, true)}`;
    case 2:
      return trangThaiCu && trangThaiCu !== trangThaiMoi
        ? `${trangThaiCu} → ${trangThaiMoi}`
        : trangThaiMoi;
    case 3:
      return `${formatBeDate(item.denNgayCu, true)} → ${formatBeDate(item.denNgayMoi, true)}`;
    case 4:
      return `${item.nguoiCu ?? ""} → ${item.nguoiMoi ?? ""}`;
    default:
      return "";
  }
};

const dotColor = (item: CongViecLichSu) =>
  item.loai === 2 || item.loai === 1
    ? getCongViecTrangThai(item.loai === 1 ? 0 : item.trangThaiMoi)?.color ?? MAU_MAC_DINH
    : item.loai === 3
    ? "#fb8c00"
    : MAU_MAC_DINH;

/**
 * Dòng thời gian cũ → mới. Web để danh sách mốc bên trái và ghi chú + file
 * của mốc đang chọn bên phải; mobile bấm vào mốc để mở ghi chú + file ngay dưới.
 */
export default function LichSuTimeline({ items, onOpenFile }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!items.length) {
    return <Text style={styles.empty}>Chưa có lịch sử.</Text>;
  }

  return (
    <View>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const files = item.files ?? [];
        const hasDetail = !!item.ghiChu || files.length > 0;
        const isOpen = expanded.has(item.id);
        const description = describe(item);

        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: dotColor(item) }]} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <TouchableOpacity
              activeOpacity={hasDetail ? 0.7 : 1}
              disabled={!hasDetail}
              onPress={() => toggle(item.id)}
              style={styles.body}
            >
              <View style={styles.titleRow}>
                <Text style={styles.title}>{CV_LICH_SU_LOAI[item.loai] ?? "Cập nhật"}</Text>
                {hasDetail ? (
                  <View style={styles.badges}>
                    {item.ghiChu ? (
                      <Ionicons name="chatbox-ellipses-outline" size={14} color={c.textSub} />
                    ) : null}
                    {files.length ? (
                      <Text style={styles.fileCount}>📎 {files.length}</Text>
                    ) : null}
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={c.textSub}
                    />
                  </View>
                ) : null}
              </View>
              {description ? <Text style={styles.description}>{description}</Text> : null}
              {item.loai === 5 && item.ghiChu && !isOpen ? (
                <Text style={styles.description} numberOfLines={1}>
                  {item.ghiChu}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {[item.nguoiThaoTac, formatBeDate(item.ngayTao, true)].filter(Boolean).join(" · ")}
              </Text>

              {isOpen ? (
                <View style={styles.detail}>
                  {item.ghiChu ? <Text style={styles.note}>{item.ghiChu}</Text> : null}
                  {files.map((file) => (
                    <WorkflowFileRow
                      key={file.id}
                      name={file.name}
                      meta={formatFileSizeKb(file.fileSize)}
                      onPress={() => onOpenFile(file)}
                    />
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    empty: {
      fontSize: 14,
      color: c.textSub,
      textAlign: "center",
      paddingVertical: 16,
    },
    row: {
      flexDirection: "row",
    },
    rail: {
      width: 22,
      alignItems: "center",
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: c.separator,
      marginTop: 2,
    },
    body: {
      flex: 1,
      paddingBottom: 16,
      paddingLeft: 6,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    badges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    fileCount: {
      fontSize: 12,
      color: c.textSub,
    },
    description: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    detail: {
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    note: {
      fontSize: 14,
      color: c.text,
      marginBottom: 4,
    },
  });
