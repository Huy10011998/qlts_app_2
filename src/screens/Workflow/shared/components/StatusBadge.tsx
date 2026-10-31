import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useSchemeColor } from "../../../../utils/helpers/colors";
import { tint } from "../workflowConstants";

type Props = {
  label: string;
  color: string;
  /** Viền chấm tròn đầu nhãn — dùng cho màu tính sẵn (maMau), khác trạng thái lưu. */
  dot?: boolean;
  /** Nền đặc, chữ trắng — nhãn tình trạng phiếu theo tài liệu BE. */
  solid?: boolean;
  /**
   * Chữ khi `color` quá nhạt để đọc: trên nền đặc thay cho chữ trắng; trên nền
   * nhạt thay cho chính `color` (chỉ giao diện sáng — nền tối thì màu nhạt đã đọc rõ).
   */
  textColor?: string;
  style?: StyleProp<ViewStyle>;
};

const SOLID_TEXT = "#FFFFFF";

/** Nhãn màu dạng viên thuốc: mặc định chữ màu đậm trên nền nhạt cùng màu. */
export default function StatusBadge({ label, color, dot, solid, textColor, style }: Props) {
  const tintedText = useSchemeColor(textColor ?? color, color);
  const labelColor = solid ? textColor ?? SOLID_TEXT : tintedText;

  return (
    <View style={[styles.badge, { backgroundColor: solid ? color : tint(color) }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text
        style={[styles.text, { color: labelColor }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  text: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
});
