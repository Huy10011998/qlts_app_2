import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  AppColors,
  useAccentBorderColors,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";
import { C } from "../../utils/helpers/colors";
import type { MenuTreeRecent } from "./useMenuTreeState";

/**
 * Hàng mục vừa mở, ngay dưới ô tìm kiếm.
 *
 * Cây menu sâu nhưng mỗi người thường chỉ dùng vài mục; hàng này cho vào lại
 * bằng một lần bấm thay vì mở nhóm rồi dò. Chỉ chứa mục lá (mở ra được nội
 * dung), không chứa nhóm.
 */
export default function MenuTreeRecents<TRecent extends MenuTreeRecent>({
  recents,
  onPressItem,
  iconName = "time-outline",
  validIds,
}: {
  recents: TRecent[];
  onPressItem: (target: TRecent) => void;
  iconName?: string;
  /**
   * Id đang có trong cây. Mục đã bị xoá hoặc bị lọc vì thu hồi quyền thì bỏ khỏi
   * hàng chip, thay vì để bấm vào rồi mở ra màn trống.
   */
  validIds?: Set<string | number>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const accentBorders = useAccentBorderColors();

  const items = validIds
    ? recents.filter((target) => validIds.has(target.id))
    : recents;

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        Truy cập nhanh
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((target) => (
          <TouchableOpacity
            key={String(target.id)}
            style={[
              styles.chip,
              {
                backgroundColor: colors.surface,
                borderColor: accentBorders.red,
              },
            ]}
            onPress={() => onPressItem(target)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Mở ${target.label}`}
          >
            <Ionicons name={iconName} size={14} color={C.red} />
            <Text style={styles.chipText} numberOfLines={1}>
              {target.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      paddingBottom: 10,
    },
    heading: {
      paddingHorizontal: 14,
      paddingBottom: 6,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: c.textSub,
    },
    row: {
      paddingHorizontal: 14,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: 190,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      shadowColor: c.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    chipText: {
      flexShrink: 1,
      fontSize: 12.5,
      fontWeight: "600",
      color: c.text,
    },
  });
