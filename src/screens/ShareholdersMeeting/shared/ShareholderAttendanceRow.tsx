import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "../../../utils/helpers/colors";
import { ShareholderRowProps } from "../../../types/Index";
import { statusConfig } from "./shareholdersMeetingHelpers";

export default function ShareholderAttendanceRow({
  item,
  onCheckIn,
  onUndoCheckIn,
  isSubmitting = false,
}: ShareholderRowProps) {
  const cfg = statusConfig[item.status];

  return (
    <View style={styles.row}>
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
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        {item.status === "pending" ? (
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
        ) : (
          <TouchableOpacity
            style={[
              styles.undoCheckInBtn,
              isSubmitting && styles.actionBtnDisabled,
            ]}
            onPress={() => onUndoCheckIn(item.id, item.shareholderId)}
            disabled={isSubmitting}
          >
            <Text style={styles.undoCheckInBtnText}>
              {isSubmitting ? "Đang xử lý..." : "Huỷ điểm danh"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
    flexShrink: 0,
  },
  rowAvatarText: { color: C.accent, fontWeight: "700", fontSize: 15 },
  rowInfo: { flex: 1 },
  rowName: { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  checkInBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  checkInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  actionBtnDisabled: { opacity: 0.6 },
  undoCheckInBtn: {
    backgroundColor: C.red,
    borderWidth: 1,
    borderColor: C.redBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  undoCheckInBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
