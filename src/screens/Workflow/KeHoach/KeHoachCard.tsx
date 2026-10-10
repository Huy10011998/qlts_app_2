import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { KeHoachItem } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import ProgressRing from "../shared/components/ProgressRing";
import WorkflowFieldLines from "../shared/components/WorkflowFieldLines";
import { findWorkflowField, WorkflowField } from "../shared/workflowFields";
import { getKeHoachProgress } from "./keHoachRules";

type Props = {
  item: KeHoachItem;
  /** Field động của thẻ (`getCardFields`). */
  fields: WorkflowField[];
  onPress: () => void;
};

/** Số, tiêu đề đứng đầu thẻ; ID_NhanVien_Tao (nhãn "Chủ trì") thành dòng riêng. */
const HEADER_FIELDS = ["SoKeHoach", "TieuDe"];

/**
 * Thẻ kế hoạch: Số · Tiêu đề · các field động · vòng tiến độ + "x/y việc"
 * (cột tính, không có trong metadata).
 */
export default function KeHoachCard({ item, fields, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const progress = getKeHoachProgress(item);
  const showSo = !!findWorkflowField(fields, "SoKeHoach");
  const showTieuDe = !!findWorkflowField(fields, "TieuDe");
  const lineFields = fields.filter(
    (field) => !HEADER_FIELDS.some((name) => name.toLowerCase() === field.name.toLowerCase()),
  );

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>
      <View style={styles.body}>
        {showSo && item.soKeHoach ? <Text style={styles.code}>{item.soKeHoach}</Text> : null}
        {showTieuDe && item.tieuDe ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.tieuDe}
          </Text>
        ) : null}
        <WorkflowFieldLines item={item} fields={lineFields} />
        {item.soThamGia ? (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={c.textSub} />
            <Text style={styles.metaText}>{item.soThamGia} người tham gia</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.progress}>
        <ProgressRing percent={progress.percent} />
        <Text style={styles.progressText}>{progress.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    body: {
      flex: 1,
      marginRight: 10,
    },
    code: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    metaText: {
      fontSize: 12,
      color: c.textSub,
    },
    progress: {
      alignItems: "center",
      width: 70,
    },
    progressText: {
      fontSize: 11,
      color: c.textSub,
      marginTop: 4,
    },
  });
