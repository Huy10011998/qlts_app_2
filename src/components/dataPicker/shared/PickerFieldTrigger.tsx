import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

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
      <Ionicons name={iconName as any} size={24} color="#E31E24" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  text: {
    color: "#000",
    flex: 1,
  },
  placeholder: {
    color: "#999",
  },
});
