import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type AssetFormActionButtonProps = {
  brandColor: string;
  iconName: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  textStyle?: StyleProp<TextStyle>;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

export default function AssetFormActionButton({
  brandColor,
  iconName,
  label,
  onPress,
  disabled = false,
  textStyle,
  variant = "primary",
  style,
}: AssetFormActionButtonProps) {
  const isPrimary = variant === "primary";
  const iconColor = isPrimary ? "#fff" : brandColor;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: disabled ? "#ccc" : brandColor }
          : styles.secondaryButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={iconName} size={18} color={iconColor} />
      <Text
        style={[
          styles.label,
          isPrimary ? styles.primaryLabel : { color: brandColor },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryLabel: {
    color: "#fff",
  },
});
