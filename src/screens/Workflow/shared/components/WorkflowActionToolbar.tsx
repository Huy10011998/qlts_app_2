import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";

export type WorkflowToolbarAction = {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  /** Xoá: chữ + icon đỏ cho khỏi bấm nhầm với Sửa. */
  tone?: "danger";
  loading?: boolean;
};

/**
 * Hàng thao tác phụ màn chi tiết (Sửa, Gia hạn, Đổi chủ trì, Nhân bản, Xoá).
 *
 * Icon trên chữ dưới, chia đều MỘT hàng: đủ chỗ 5 nút cả ở màn hẹp lẫn cỡ chữ
 * lớn, không phải giấu nút nào vào ⋯. Hàng nút ngang tự xuống dòng thì tuỳ quyền
 * và cỡ chữ mà rớt nút lẻ xuống hàng dưới.
 */
export default function WorkflowActionToolbar({ actions }: { actions: WorkflowToolbarAction[] }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  if (!actions.length) return null;

  return (
    <View style={styles.bar}>
      {actions.map((action, index) => {
        const color = action.tone === "danger" ? c.red : c.textSecondary;
        return (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.7}
            disabled={action.loading}
            onPress={action.onPress}
            style={[styles.item, index > 0 && styles.itemDivider]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={color} style={styles.icon} />
            ) : (
              <Ionicons name={action.icon} size={19} color={color} style={styles.icon} />
            )}
            <Text
              style={[styles.label, { color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginBottom: 2,
      ...elevation(c.shadow, 1),
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minHeight: 56,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    itemDivider: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.separator,
    },
    // Vòng xoay (Xoá đang chạy) cao 20: giữ ô cùng chiều cao với icon.
    icon: {
      height: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
