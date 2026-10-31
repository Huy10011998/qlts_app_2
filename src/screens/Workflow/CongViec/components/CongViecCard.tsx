import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { CongViecItem, CongViecThongTin } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import StatusBadge from "../../shared/components/StatusBadge";
import WorkflowCounter from "../../shared/components/WorkflowCounter";
import WorkflowFieldLines from "../../shared/components/WorkflowFieldLines";
import { CounterPendingPills } from "../../shared/components/WorkflowListSkeleton";
import { getCongViecTrangThai, getMaMauColor } from "../../shared/workflowConstants";
import { findWorkflowField, WorkflowField } from "../../shared/workflowFields";
import { getCongViecHanBadge } from "../congViecRules";

type Props = {
  item: CongViecItem;
  /** Field động của thẻ (`getCardFields`, đã bỏ TrangThai). */
  fields: WorkflowField[];
  info?: CongViecThongTin;
  /** cv-thong-tin của việc đang gọi (`useInfoPending`) — giữ chỗ chân thẻ. */
  infoPending?: boolean;
  onPress: () => void;
  /** Bấm số bình luận / số file mở thẳng màn đó; không truyền thì bấm như bấm thẻ. */
  onOpenComments?: () => void;
  onOpenFiles?: () => void;
  /** Viên Lịch sử (chỉ icon) ở chân thẻ, sau Bình luận / File. Không truyền thì không có. */
  onOpenLichSu?: () => void;
};

/** Hai field đứng ở đầu thẻ thay vì thành dòng "Nhãn: giá trị". */
const HEADER_FIELDS = ["SoCongViec", "TieuDe"];

/**
 * Phần nào của thẻ hiện theo metadata: Số và tiêu đề lên đầu thẻ (chỉ khi
 * metadata cho hiện trên mobile), còn lại thành dòng "Nhãn: giá trị". Khung chờ
 * của danh sách dựng theo đúng hàm này.
 */
export const getCongViecCardLayout = (fields: WorkflowField[]) => ({
  showSo: !!findWorkflowField(fields, "SoCongViec"),
  showTieuDe: !!findWorkflowField(fields, "TieuDe"),
  lineFields: fields.filter(
    (field) => !HEADER_FIELDS.some((name) => name.toLowerCase() === field.name.toLowerCase()),
  ),
});

/**
 * Thẻ công việc: vạch màu maMau bên trái, Số + nhãn hạn + trạng thái, tiêu đề, chủ
 * trì (cột tính, không có trong metadata), các field động, số bình luận / file.
 * Số và tiêu đề chỉ hiện khi metadata cho hiện trên mobile.
 */
export default function CongViecCard({
  item,
  fields,
  info,
  infoPending,
  onPress,
  onOpenComments,
  onOpenFiles,
  onOpenLichSu,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const trangThai = getCongViecTrangThai(item.trangThai);
  // Vạch màu bên trái chỉ 5px, dễ lướt qua — Quá hạn / Gia hạn ghi thêm thành chữ
  // cạnh trạng thái, giống màn chi tiết.
  const hanBadge = getCongViecHanBadge(item.maMau);
  const { showSo, showTieuDe, lineFields } = getCongViecCardLayout(fields);

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: getMaMauColor(item.maMau) }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          {showSo && item.soCongViec ? (
            <Text style={styles.code} numberOfLines={1}>
              {item.soCongViec}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          <View style={styles.badges}>
            {hanBadge ? <StatusBadge label={hanBadge.label} color={hanBadge.color} dot /> : null}
            {trangThai ? (
              <StatusBadge
                label={trangThai.label}
                color={trangThai.color}
                textColor={trangThai.textColor}
              />
            ) : null}
          </View>
        </View>

        {showTieuDe && item.tieuDe ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.tieuDe}
          </Text>
        ) : null}

        {item.chuTri_MoTa ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-circle-outline" size={15} color={c.textSub} />
            <Text style={styles.metaText} numberOfLines={1}>
              Chủ trì: {item.chuTri_MoTa}
            </Text>
          </View>
        ) : null}

        <WorkflowFieldLines item={item} fields={lineFields} />

        {/* Chân thẻ chỉ mọc ra khi cv-thong-tin về (sau trang danh sách) — trong
            lúc chờ thì giữ sẵn chỗ bằng hai viên xám, thẻ khỏi dài thêm ~47pt. */}
        {info || item.iD_DinhKy || infoPending || onOpenLichSu ? (
          <View style={styles.footer}>
            {info ? (
              <>
                <WorkflowCounter
                  icon="chatbubble-ellipses-outline"
                  iconSize={14}
                  count={info.soBinhLuan ?? 0}
                  label="Bình luận"
                  onPress={onOpenComments}
                />
                <WorkflowCounter
                  icon="attach-outline"
                  iconSize={15}
                  count={info.soFile ?? 0}
                  label="Đính kèm"
                  onPress={onOpenFiles}
                />
              </>
            ) : infoPending ? (
              <CounterPendingPills />
            ) : null}
            {/* Không chờ cv-thong-tin: lịch sử tự tải khi mở. */}
            {onOpenLichSu ? (
              <WorkflowCounter
                icon="history"
                iconFamily="material"
                iconSize={15}
                label="Lịch sử"
                onPress={onOpenLichSu}
              />
            ) : null}
            {item.iD_DinhKy ? (
              <View style={styles.counter}>
                <Ionicons name="repeat-outline" size={14} color={c.textSub} />
                <Text style={styles.counterText}>
                  Định kỳ{item.lanLap ? ` · lần ${item.lanLap}` : ""}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    stripe: {
      width: 5,
    },
    body: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    flex: {
      flex: 1,
    },
    badges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    code: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      marginTop: 6,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 4,
    },
    metaText: {
      flex: 1,
      fontSize: 13,
      color: c.textSecondary,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    counter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    counterText: {
      fontSize: 12,
      color: c.textSub,
    },
  });
