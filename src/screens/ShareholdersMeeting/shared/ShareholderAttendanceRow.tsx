import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  AppColors,
  useAccentBorderColors,
  useHairlineBorderColor,
  useStyles,
  useThemeValue,
} from "../../../utils/helpers/colors";
import type { ShareholderRowProps } from "../../../types/index";
import { makeStatusConfig } from "./shareholdersMeetingHelpers";

export default function ShareholderAttendanceRow({
  item,
  onCheckIn,
  onUndoCheckIn,
  isSubmitting = false,
  canCheckIn = true,
  canUndoCheckIn = true,
}: ShareholderRowProps) {
  const styles = useStyles(makeStyles);
  const cfg = useThemeValue(makeStatusConfig)[item.status];
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();

  return (
    <View style={[styles.row, { borderColor: hairlineBorderColor }]}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.shareholderId} · {item.shares} CP
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: cfg.bg,
              borderColor:
                item.status === "present"
                  ? accentBorders.green
                  : accentBorders.slate,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        {item.isLock ? (
          <View
            style={[styles.lockBadge, { borderColor: accentBorders.slate }]}
          >
            <Text style={styles.lockBadgeText}>Đã khóa</Text>
          </View>
        ) : /* Thiếu quyền ghi thì dòng chỉ còn nhãn trạng thái — đủ để theo dõi
              tiến độ đại hội mà không bấm được gì. */
        item.status === "pending" ? (
          canCheckIn ? (
            <TouchableOpacity
              style={[
                styles.checkInBtn,
                isSubmitting && styles.actionBtnDisabled,
              ]}
              onPress={() => onCheckIn(item.id, item.shareholderId)}
              disabled={isSubmitting}
            >
              <Text style={styles.checkInBtnText}>
                {isSubmitting ? "Đang xử lý..." : "Điểm danh"}
              </Text>
            </TouchableOpacity>
          ) : null
        ) : canUndoCheckIn ? (
          <TouchableOpacity
            style={[
              styles.undoCheckInBtn,
              { borderColor: accentBorders.red },
              isSubmitting && styles.actionBtnDisabled,
            ]}
            onPress={() => onUndoCheckIn(item.id, item.shareholderId)}
            disabled={isSubmitting}
          >
            <Text style={styles.undoCheckInBtnText}>
              {isSubmitting ? "Đang xử lý..." : "Huỷ điểm danh"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    rowAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderWidth: 1.5,
      borderColor: c.accent,
      flexShrink: 0,
    },
    rowAvatarText: { color: c.accent, fontWeight: "700", fontSize: 15 },
    rowInfo: { flex: 1 },
    rowName: { color: c.textPrimary, fontSize: 14, fontWeight: "600" },
    rowMeta: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 8 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: "600" },
    lockBadge: {
      backgroundColor: c.slateLight,
      borderWidth: 1,
      borderColor: c.slateBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    lockBadgeText: { color: c.slate, fontSize: 11, fontWeight: "700" },
    checkInBtn: {
      backgroundColor: c.accent,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    checkInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
    actionBtnDisabled: { opacity: 0.6 },
    undoCheckInBtn: {
      backgroundColor: c.red,
      borderWidth: 1,
      borderColor: c.redBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    undoCheckInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  });
