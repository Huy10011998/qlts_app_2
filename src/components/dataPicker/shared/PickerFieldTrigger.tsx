import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";
import { pickerFieldTriggerStyles as styles } from "./pickerFieldTriggerStyles";

type PickerFieldTriggerProps = {
  iconName: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
};

export default function PickerFieldTrigger({
  iconName,
  placeholder,
  value,
  onPress,
}: PickerFieldTriggerProps) {
  return (
    <TouchableOpacity style={styles.input} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.text, !value && styles.placeholder]}>
        {value || placeholder}
      </Text>
      <Ionicons name={iconName as any} size={24} color={C.red} />
    </TouchableOpacity>
  );
}
