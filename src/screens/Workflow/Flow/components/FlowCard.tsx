import React from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { FlowRecord, FlowThongTin } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import StatusBadge from "../../shared/components/StatusBadge";
import WorkflowCounter from "../../shared/components/WorkflowCounter";
import WorkflowFieldLines from "../../shared/components/WorkflowFieldLines";
import { FlowStepPendingRow } from "../../shared/components/WorkflowListSkeleton";
import { getFlowTinhTrang as getTinhTrangOption } from "../../shared/workflowConstants";
import { WorkflowField } from "../../shared/workflowFields";
import { getFlowLabel, getFlowTinhTrang } from "../flowRules";

type Props = {
  item: FlowRecord;
  /** Field động của thẻ (`getCardFields`, đã bỏ TinhTrang). */
  fields: WorkflowField[];
  /** Tên cột số phiếu của flow (get-class-by-name). */
  soPhieuField: string | null;
  info?: FlowThongTin;
  /** flow-thong-tin của phiếu đang gọi (`useInfoPending`) — giữ chỗ dòng bước hiện tại. */
  infoPending?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  /** Bấm số bình luận / số file mở thẳng màn đó; không truyền thì bấm như bấm thẻ. */
  onOpenComments?: () => void;
  onOpenFiles?: () => void;
  /** Viên Quy trình (chỉ icon) cạnh số file; không truyền thì không có viên. */
  onOpenProcess?: () => void;
  /** Số file mờ, không bấm được — khi nút Đính kèm ở chi tiết cũng tắt. */
  filesDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chờ duyệt · Đang xử lý (`FLOW_TINH_TRANG`): phiếu đang chạy quy trình nên chắc
 * có bước hiện tại. Nháp chưa vào quy trình; phiếu đã xong / từ chối / huỷ không
 * hứa có bước — giữ chỗ cho chúng thì thẻ lại co lại lúc thông tin về.
 */
const TINH_TRANG_CO_BUOC = new Set([1, 2]);

/**
 * Field thành dòng "Nhãn: giá trị": số phiếu đã lên dòng tiêu đề nên không lặp
 * lại thành dòng "Số: ...". Khung chờ của danh sách đếm dòng theo đúng hàm này.
 */
export const getFlowCardLineFields = (fields: WorkflowField[], soPhieuField: string | null) =>
  soPhieuField
    ? fields.filter((field) => field.name.toLowerCase() !== soPhieuField.toLowerCase())
    : fields;

/**
 * Thẻ phiếu: KHÔNG ghi cứng field của flow nào (mỗi flow một bộ field). Dòng
 * tiêu đề là số phiếu (tên cột lấy từ server, nháp chưa có số thì "#<id>"),
 * phần động còn lại là "Nhãn: giá trị". Vẽ riêng: nhãn tình trạng, bước hiện
 * tại, số bình luận / file + viên Quy trình. Nút Trả bước / Từ chối / Không
 * ý kiến / Duyệt không nằm trên thẻ: danh sách vuốt thẻ sang trái mới hiện.
 */
export default function FlowCard({
  item,
  fields,
  soPhieuField,
  info,
  infoPending,
  selectable,
  selected,
  onPress,
  onLongPress,
  onOpenComments,
  onOpenFiles,
  onOpenProcess,
  filesDisabled,
  style,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const tinhTrangValue = getFlowTinhTrang(item);
  const tinhTrang = getTinhTrangOption(tinhTrangValue);
  const lineFields = getFlowCardLineFields(fields, soPhieuField);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.card, selected && styles.cardSelected, style]}
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
        {tinhTrang ? (
          <StatusBadge
            label={tinhTrang.label}
            color={tinhTrang.color}
            textColor={tinhTrang.textColor}
            solid
          />
        ) : null}
      </View>

      {info?.buocHienTai ? (
        <View style={styles.stepRow}>
          <Ionicons name="git-commit-outline" size={15} color={info.isToiLuot ? c.red : c.textSub} />
          <Text style={[styles.stepText, info.isToiLuot && styles.stepMine]} numberOfLines={1}>
            {info.buocHienTai}
          </Text>
        </View>
      ) : !info && infoPending && TINH_TRANG_CO_BUOC.has(tinhTrangValue) ? (
        <FlowStepPendingRow />
      ) : null}

      <WorkflowFieldLines item={item} fields={lineFields} />

      <View style={styles.footer}>
        <View style={styles.counters}>
          <WorkflowCounter
            icon="chatbubble-ellipses-outline"
            iconSize={14}
            count={info?.soBinhLuan ?? 0}
            label="Bình luận"
            onPress={onOpenComments}
          />
          <WorkflowCounter
            icon="attach-outline"
            iconSize={15}
            count={info?.soFile ?? 0}
            label="File đính kèm"
            onPress={onOpenFiles}
            disabled={filesDisabled}
          />
          {onOpenProcess ? (
            <WorkflowCounter icon="git-network-outline" iconSize={14} label="Quy trình" onPress={onOpenProcess} />
          ) : null}
        </View>
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
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    counters: {
      flexDirection: "row",
      gap: 6,
    },
  });
