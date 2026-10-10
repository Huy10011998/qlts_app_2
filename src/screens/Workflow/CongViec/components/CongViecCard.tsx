import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { CongViecItem, CongViecThongTin } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import StatusBadge from "../../shared/components/StatusBadge";
import WorkflowFieldLines from "../../shared/components/WorkflowFieldLines";
import { getCongViecTrangThai, getMaMauColor } from "../../shared/workflowConstants";
import { findWorkflowField, WorkflowField } from "../../shared/workflowFields";

type Props = {
  item: CongViecItem;
  /** Field động của thẻ (`getCardFields`, đã bỏ TrangThai). */
  fields: WorkflowField[];
  info?: CongViecThongTin;
  onPress: () => void;
};

/** Hai field đứng ở đầu thẻ thay vì thành dòng "Nhãn: giá trị". */
const HEADER_FIELDS = ["SoCongViec", "TieuDe"];

/**
 * Thẻ công việc: vạch màu maMau bên trái, Số + nhãn trạng thái, tiêu đề, chủ
 * trì (cột tính, không có trong metadata), các field động, số bình luận / file.
 * Số và tiêu đề chỉ hiện khi metadata cho hiện trên mobile.
 */
export default function CongViecCard({ item, fields, info, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const trangThai = getCongViecTrangThai(item.trangThai);
  const showSo = !!findWorkflowField(fields, "SoCongViec");
  const showTieuDe = !!findWorkflowField(fields, "TieuDe");
  const lineFields = fields.filter(
    (field) => !HEADER_FIELDS.some((name) => name.toLowerCase() === field.name.toLowerCase()),
  );

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
          {trangThai ? <StatusBadge label={trangThai.label} color={trangThai.color} /> : null}
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

        {info || item.iD_DinhKy ? (
          <View style={styles.footer}>
            {info ? (
              <>
                <View style={styles.counter}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={c.textSub} />
                  <Text style={styles.counterText}>{info.soBinhLuan ?? 0}</Text>
                </View>
                <View style={styles.counter}>
                  <Ionicons name="attach-outline" size={15} color={c.textSub} />
                  <Text style={styles.counterText}>{info.soFile ?? 0}</Text>
                </View>
              </>
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
      gap: 14,
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
