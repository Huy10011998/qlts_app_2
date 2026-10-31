import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

export type WorkflowHeroLink = {
  key: string;
  icon: string;
  label: string;
  /** Thiếu (khung chờ) thì chỉ hiện nhãn. */
  count?: number;
  /** Thiếu thì không bấm được (khung chờ). */
  onPress?: () => void;
  /** Mờ đi, không bấm được — vd Đính kèm của phiếu chưa có file mà mình không thêm được. */
  disabled?: boolean;
};

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Dải Bình luận · Đính kèm ở đáy thẻ đầu màn chi tiết.
 *
 * Hai mục này là chỗ XEM kèm con số, không phải việc làm trên hồ sơ. Để chung
 * hàng nút thì thành ba nút đỏ đứng cạnh nhau, nút chính (Chuyển trạng thái)
 * lẫn vào giữa.
 */
export default function WorkflowHeroLinks({ links }: { links: WorkflowHeroLink[] }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.row}>
      {links.map((link, index) => (
        <TouchableOpacity
          key={link.key}
          activeOpacity={0.7}
          disabled={link.disabled || !link.onPress}
          onPress={link.onPress}
          style={[styles.item, index > 0 && styles.itemDivider]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!link.disabled }}
          accessibilityLabel={link.count == null ? link.label : `${link.label}, ${link.count}`}
        >
          <View style={[styles.itemBody, link.disabled && styles.itemDisabled]}>
            <Ionicons name={link.icon} size={16} color={c.textSecondary} />
            <Text style={styles.label} numberOfLines={1}>
              {link.label}
            </Text>
            {link.count != null ? (
              <View style={[styles.count, !link.count && styles.countEmpty]}>
                <Text style={[styles.countText, !link.count && styles.countTextEmpty]}>
                  {formatCount(link.count)}
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Tràn sát hai mép và đáy thẻ (thẻ đầu padding 14): đường kẻ chạy hết bề
    // ngang, vùng bấm cao đủ ~44.
    row: {
      flexDirection: "row",
      marginTop: 12,
      marginHorizontal: -14,
      marginBottom: -14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    item: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    itemDivider: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.separator,
    },
    // Mờ phần ruột, không mờ ô: đường kẻ giữa hai ô giữ nguyên độ đậm.
    itemBody: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    itemDisabled: {
      opacity: 0.5,
    },
    label: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    // Cùng dáng số trên thanh tab (Lịch sử 2).
    count: {
      minWidth: 20,
      paddingHorizontal: 5,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
    },
    countEmpty: {
      backgroundColor: c.surfaceAlt,
    },
    countText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.red,
    },
    countTextEmpty: {
      color: c.textMuted,
    },
  });
