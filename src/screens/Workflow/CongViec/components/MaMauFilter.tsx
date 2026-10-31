import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useThemePreference } from "../../../../context/ThemeContext";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { CV_MA_MAU, tint } from "../../shared/workflowConstants";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Màu không bao giờ có trong danh sách đang xem (vd lịch không trả việc Hủy). */
  exclude?: string[];
  /**
   * Chip cao hơn (vùng bấm ~34 thay vì ~28). Chưa để mặc định: màn Lịch vừa
   * dựng lại theo chiều cao chip cũ.
   */
  spacious?: boolean;
  /**
   * Số việc theo màu, hiện thành viên số sau tên chip. Màu không có trong object
   * thì chip không có số (vd đang lọc: chưa biết số của màu không chọn).
   */
  counts?: Partial<Record<string, number>>;
};

/**
 * Chip lọc theo màu tính sẵn (maMau), chọn nhiều; rỗng = không lọc.
 *
 * ScrollView ngang mặc định có flexGrow / flexShrink = 1: đặt thẳng trong cột
 * cùng danh sách (flex 1) là bị bóp thấp, chip mất nửa dưới chữ — nên phải
 * chốt `flexGrow: 0, flexShrink: 0` để cao đúng bằng nội dung.
 */
export default function MaMauFilter({ value, onChange, exclude, spacious, counts }: Props) {
  const styles = useStyles(makeStyles);
  // Chữ chip đang chọn: màu nhạt (Hủy) chỉ đọc được trên nền tối.
  const dark = useThemePreference().resolvedColorScheme === "dark";

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {CV_MA_MAU.filter((item) => !exclude?.includes(item.key)).map((item) => {
        const active = value.includes(item.key);
        const count = counts?.[item.key];
        const textColor = dark ? item.color : item.textColor ?? item.color;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => toggle(item.key)}
            style={[
              styles.chip,
              spacious && styles.chipSpacious,
              active && { backgroundColor: tint(item.color, "26"), borderColor: item.color },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text
              style={[styles.text, active && { color: textColor }]}
            >
              {item.label}
            </Text>
            {count != null ? (
              // Chip đang chọn: viên đặc màu chip; còn lại nền nhạt cùng màu, số 0 xám.
              <View
                style={[
                  styles.count,
                  active
                    ? { backgroundColor: item.color }
                    : count > 0
                      ? { backgroundColor: tint(item.color) }
                      : styles.countZero,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    active
                      ? styles.countTextActive
                      : count > 0
                        ? { color: textColor }
                        : styles.countTextZero,
                  ]}
                >
                  {count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surface,
    },
    // Chip nhỏ hàng ngang, bấm lệch là trượt: 8 cho vùng bấm cao ~34.
    chipSpacious: {
      paddingVertical: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 5,
    },
    text: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
    },
    count: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      marginLeft: 6,
      marginRight: -4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    countZero: {
      backgroundColor: c.surfaceAlt,
    },
    countText: {
      fontSize: 11,
      fontWeight: "700",
    },
    countTextActive: {
      color: "#FFFFFF",
    },
    countTextZero: {
      color: c.textMuted,
    },
  });
