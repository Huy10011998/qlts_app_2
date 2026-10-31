import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import type { ShareholderRowProps } from "../../../types/index";
import {
  formatShares,
  getAvatarTone,
  getShareholderInitial,
  isOrganizationShareholder,
} from "./shareholdersMeetingHelpers";

/**
 * Một cổ đông trong tab Điểm danh (mẫu A): hai dòng tên + mã · cổ phần. Đã có
 * mặt thì ảnh đại diện có dấu ✓ xanh và cuối dòng mã thêm chữ "Có mặt" xanh.
 * Bên phải là một nút vuông — ✓ điểm danh (nền đỏ nhạt) hoặc ↶ huỷ (xám).
 */
export default function ShareholderAttendanceRow({
  item,
  onCheckIn,
  onUndoCheckIn,
  isSubmitting = false,
  canCheckIn = true,
  canUndoCheckIn = true,
}: ShareholderRowProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const tone = getAvatarTone(item.name, c);
  const isPresent = item.status === "present";

  /* Thiếu quyền ghi thì dòng chỉ còn trạng thái — đủ để theo dõi tiến độ đại
     hội mà không bấm được gì. */
  let action: React.ReactNode = null;
  if (item.isLock) {
    action = (
      <View
        accessible
        accessibilityLabel="Đã khóa"
        style={[styles.actionButton, styles.actionMuted]}
      >
        <Ionicons name="lock-closed-outline" size={18} color={c.slate} />
      </View>
    );
  } else if (!isPresent && canCheckIn) {
    action = (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Điểm danh ${item.name}`}
        activeOpacity={0.8}
        disabled={isSubmitting}
        onPress={() => onCheckIn(item.id, item.shareholderId)}
        style={[
          styles.actionButton,
          styles.actionPrimary,
          isSubmitting && styles.actionDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={c.red} />
        ) : (
          <Ionicons name="checkmark" size={23} color={c.red} />
        )}
      </TouchableOpacity>
    );
  } else if (isPresent && canUndoCheckIn) {
    action = (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Huỷ điểm danh ${item.name}`}
        activeOpacity={0.8}
        disabled={isSubmitting}
        onPress={() => onUndoCheckIn(item.id, item.shareholderId)}
        style={[
          styles.actionButton,
          styles.actionMuted,
          isSubmitting && styles.actionDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={c.textSub} />
        ) : (
          <Ionicons name="arrow-undo-outline" size={19} color={c.textSub} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, { borderColor: hairlineBorderColor }]}>
      <View>
        <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
          {isOrganizationShareholder(item.name) ? (
            <Ionicons name="business" size={19} color={tone.fg} />
          ) : (
            <Text style={[styles.avatarText, { color: tone.fg }]}>
              {getShareholderInitial(item.name)}
            </Text>
          )}
        </View>
        {isPresent ? (
          <View style={styles.presentBadge}>
            <Ionicons name="checkmark" size={11} color={c.surface} />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.shareholderId} · {formatShares(item.shares)} CP
          {isPresent ? <Text style={styles.metaPresent}> · Có mặt</Text> : null}
        </Text>
      </View>
      {action}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
      paddingVertical: 12,
      paddingLeft: 14,
      paddingRight: 12,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: c.surface,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontWeight: "700", fontSize: 15 },
    // Viền màu thẻ tách dấu ✓ khỏi vòng chữ cái bên dưới.
    presentBadge: {
      position: "absolute",
      right: -3,
      bottom: -3,
      width: 19,
      height: 19,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.green,
    },
    info: { flex: 1, minWidth: 0 },
    name: { color: c.textPrimary, fontSize: 15, fontWeight: "600" },
    meta: { color: c.textMuted, fontSize: 13, marginTop: 2 },
    metaPresent: { color: c.green, fontWeight: "700" },
    actionButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    actionPrimary: { backgroundColor: c.redSurface },
    actionMuted: { backgroundColor: c.surfaceAlt },
    actionDisabled: { opacity: 0.6 },
  });
