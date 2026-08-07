import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";

type NoiDiaNoteCardProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  /** Nội dung phụ nằm dưới ô nhập (toạ độ, thời gian chụp...). */
  children?: React.ReactNode;
};

/**
 * Thẻ "Ghi chú" dùng chung cho hai màn nhập của nhóm Nội địa.
 *
 * Việc tránh bàn phím do `NoiDiaFormScroll` lo, bằng cơ chế của hệ điều hành —
 * ở đây không cần ref hay xử lý focus gì cả.
 */
export default function NoiDiaNoteCard({
  value,
  onChangeText,
  editable = true,
  children,
}: NoiDiaNoteCardProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ghi chú</Text>
      <TextInput
        style={styles.noteInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Nhập ghi chú (không bắt buộc)"
        placeholderTextColor={c.placeholder}
        multiline
        editable={editable}
      />
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
      marginBottom: 10,
    },
    noteInput: {
      minHeight: 70,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      backgroundColor: c.input,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      textAlignVertical: "top",
    },
  });
