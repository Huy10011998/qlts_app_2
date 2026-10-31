import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../utils/helpers/textScaling";
import type { LichMode } from "./lichHelpers";
import LichTodayIcon from "./LichTodayIcon";

/** Icon lưới = tháng, danh sách = tuần; Hôm nay không có `icon` — vẽ tờ lịch ghi số ngày thật. */
const MODE_TABS: { mode: LichMode; label: string; icon?: string }[] = [
  { mode: "thang", label: "Tháng", icon: "grid-outline" },
  { mode: "tuan", label: "Tuần", icon: "list-outline" },
  { mode: "homnay", label: "Hôm nay" },
];

/**
 * Các nút chia đều bề ngang: nút "Hôm nay" (icon 16 + cách 6 + chữ ~56pt ở cỡ
 * chữ gốc) không đủ chỗ thì bỏ icon cả hàng, giữ chữ đọc trọn.
 */
const showModeIcons = () =>
  (Dimensions.get("window").width - 30) / MODE_TABS.length >= 24 + 56 * getTextScaleFactor();

type Props = {
  mode: LichMode;
  onSwitch: (mode: LichMode) => void;
};

/** Thanh chế độ Tháng | Tuần | Hôm nay ở đầu màn Lịch. */
export default function LichModeTabs({ mode, onSwitch }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const icons = showModeIcons();

  return (
    // Khung trắng có viền + bóng: nền xám cũ trùng nền trang, chỉ còn viên đang
    // chọn lơ lửng.
    <View style={styles.segment}>
      {MODE_TABS.map((item) => {
        const active = mode === item.mode;
        return (
          <TouchableOpacity
            key={item.mode}
            activeOpacity={0.8}
            style={[styles.segmentItem, active && styles.segmentActive]}
            onPress={() => onSwitch(item.mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {!icons ? null : item.icon ? (
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? c.onBrand : c.textSub}
              />
            ) : (
              <LichTodayIcon color={active ? c.onBrand : c.textSub} />
            )}
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Cùng kiểu thẻ trắng viền mảnh + bóng nhẹ với viên tháng và nút ‹ › bên dưới.
    segment: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 3,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segmentItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 9,
    },
    segmentActive: {
      backgroundColor: c.red,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSub,
    },
    segmentTextActive: {
      color: c.onBrand,
    },
  });
