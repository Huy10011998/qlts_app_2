import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { FlowRecord, FlowThongTin } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import StatusBadge from "../../shared/components/StatusBadge";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowFieldLines from "../../shared/components/WorkflowFieldLines";
import { getFlowTinhTrang as getTinhTrangOption } from "../../shared/workflowConstants";
import { WorkflowField } from "../../shared/workflowFields";
import { FlowActions, getFlowLabel, getFlowTinhTrang } from "../flowRules";

type Props = {
  item: FlowRecord;
  /** Field động của thẻ (`getCardFields`, đã bỏ TinhTrang). */
  fields: WorkflowField[];
  /** Tên cột số phiếu của flow (get-class-by-name). */
  soPhieuField: string | null;
  info?: FlowThongTin;
  actions: FlowActions;
  selectable?: boolean;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onNoOpinion?: () => void;
};

/**
 * Thẻ phiếu: KHÔNG ghi cứng field của flow nào (mỗi flow một bộ field). Dòng
 * tiêu đề là số phiếu (tên cột lấy từ server, nháp chưa có số thì "#<id>"),
 * phần động còn lại là "Nhãn: giá trị". Vẽ riêng: nhãn tình trạng, bước hiện
 * tại, số bình luận / file, nút Duyệt / Không ý kiến / Từ chối khi tới lượt tôi.
 */
export default function FlowCard({
  item,
  fields,
  soPhieuField,
  info,
  actions,
  selectable,
  selected,
  onPress,
  onLongPress,
  onApprove,
  onReject,
  onNoOpinion,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const tinhTrang = getTinhTrangOption(getFlowTinhTrang(item));
  // Số phiếu đã lên dòng tiêu đề — không lặp lại thành dòng "Số: ...".
  const lineFields = soPhieuField
    ? fields.filter((field) => field.name.toLowerCase() !== soPhieuField.toLowerCase())
    : fields;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.headerRow}>
        {selectable ? (
          <Ionicons
            name={selected ? "checkbox" : "square-outline"}
            size={20}
            color={selected ? c.red : c.textMuted}
            style={styles.checkbox}
          />
        ) : null}
        <Text style={styles.head} numberOfLines={1}>
          {getFlowLabel(item, soPhieuField)}
        </Text>
        {tinhTrang ? <StatusBadge label={tinhTrang.label} color={tinhTrang.color} solid /> : null}
      </View>

      {info?.buocHienTai ? (
        <View style={styles.stepRow}>
          <Ionicons name="git-commit-outline" size={15} color={info.isToiLuot ? c.red : c.textSub} />
          <Text style={[styles.stepText, info.isToiLuot && styles.stepMine]} numberOfLines={1}>
            {info.isToiLuot ? "Chờ tôi · " : ""}
            {info.buocHienTai}
          </Text>
        </View>
      ) : null}

      <WorkflowFieldLines item={item} fields={lineFields} />

      <View style={styles.footer}>
        <View style={styles.counters}>
          <View style={styles.counter}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={c.textSub} />
            <Text style={styles.counterText}>{info?.soBinhLuan ?? 0}</Text>
          </View>
          <View style={styles.counter}>
            <Ionicons name="attach-outline" size={15} color={c.textSub} />
            <Text style={styles.counterText}>{info?.soFile ?? 0}</Text>
          </View>
        </View>
        {actions.duyet && !selectable ? (
          <View style={styles.quickActions}>
            <WorkflowButton compact variant="danger" label="Từ chối" onPress={onReject ?? onPress} />
            {actions.khongYKien ? (
              <WorkflowButton compact variant="neutral" label="Không ý kiến" onPress={onNoOpinion ?? onPress} />
            ) : null}
            <WorkflowButton compact variant="success" label="Duyệt" onPress={onApprove ?? onPress} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: c.surface,
      ...elevation(c.shadow, 1),
    },
    cardSelected: {
      borderColor: c.red,
      backgroundColor: c.redSurface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    checkbox: {
      marginRight: -2,
    },
    head: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 6,
    },
    stepText: {
      flex: 1,
      fontSize: 13,
      color: c.textSecondary,
    },
    stepMine: {
      color: c.red,
      fontWeight: "600",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    counters: {
      flexDirection: "row",
      gap: 14,
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
    quickActions: {
      flexDirection: "row",
      gap: 6,
    },
  });
