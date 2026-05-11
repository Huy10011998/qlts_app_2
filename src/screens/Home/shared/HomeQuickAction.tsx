import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type HomeQuickActionProps = {
  iconName: string;
  label: string;
  bg: string;
  color: string;
  onPress?: () => void;
  disabled?: boolean;
};

export default function HomeQuickAction({
  iconName,
  label,
  bg,
  color,
  onPress,
  disabled,
}: HomeQuickActionProps) {
  return (
    <TouchableOpacity
      style={[styles.item, disabled && styles.itemDisabled]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
    >
      <View style={[styles.icon, { backgroundColor: bg }, disabled && styles.iconDisabled]}>
        <Ionicons name={iconName} size={17} color={color} />
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    gap: 6,
  },
  itemDisabled: {
    opacity: 0.55,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
  },
  labelDisabled: {
    color: "#9CA3AF",
  },
});
