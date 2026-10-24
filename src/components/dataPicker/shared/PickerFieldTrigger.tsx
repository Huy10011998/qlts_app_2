import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  C,
  useAppColors,
  useStrongBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { makePickerFieldTriggerStyles } from "./pickerFieldTriggerStyles";

type PickerFieldTriggerProps = {
  /** Khoá: vẫn hiện giá trị nhưng không bấm mở được. */
  disabled?: boolean;
  iconName: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
};

export default function PickerFieldTrigger({
  disabled = false,
  iconName,
  placeholder,
  value,
  onPress,
}: PickerFieldTriggerProps) {
  const styles = useStyles(makePickerFieldTriggerStyles);
  const c = useAppColors();
  const strongBorderColor = useStrongBorderColor();
  return (
    <TouchableOpacity
      style={[
        styles.input,
        { borderColor: strongBorderColor },
        disabled && styles.blocked,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, !value && styles.placeholder]}>
        {value || placeholder}
      </Text>
      <Ionicons
        name={iconName as any}
        size={24}
        color={disabled ? c.textMuted : C.red}
      />
    </TouchableOpacity>
  );
}
