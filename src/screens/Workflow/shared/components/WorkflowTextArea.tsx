import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Dòng tối thiểu của ô (mặc định 3). */
  lines?: number;
  maxLength?: number;
};

/** Ô nhập nhiều dòng: ý kiến duyệt, ghi chú chuyển trạng thái / gia hạn... */
export default function WorkflowTextArea({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  lines = 3,
  maxLength,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.block}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        multiline
        maxLength={maxLength}
        textAlignVertical="top"
        style={[styles.input, { minHeight: 22 * lines + 20 }]}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    block: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 7,
      color: c.textSecondary,
    },
    required: {
      color: c.red,
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.input,
    },
  });
