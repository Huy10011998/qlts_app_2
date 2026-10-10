import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../../../utils/helpers/textScaling";
import { CV_MA_MAU, tint } from "../../shared/workflowConstants";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * Chip lọc theo màu tính sẵn (maMau), chọn nhiều; rỗng = không lọc.
 *
 * ScrollView ngang mặc định có flexGrow / flexShrink = 1: đặt thẳng trong cột
 * cùng danh sách (flex 1) là bị bóp thấp, chip mất nửa dưới chữ — nên phải
 * chốt `flexGrow: 0, flexShrink: 0` để cao đúng bằng nội dung.
 */
export default function MaMauFilter({ value, onChange }: Props) {
  const styles = useStyles(makeStyles);

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {CV_MA_MAU.map((item) => {
        const active = value.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => toggle(item.key)}
            style={[
              styles.chip,
              active && { backgroundColor: tint(item.color, "26"), borderColor: item.color },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text
              style={[styles.text, active && { color: item.color }]}
              maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
            >
              {item.label}
            </Text>
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
  });
