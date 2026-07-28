import {
  AppColors,
  useAccentBorderColors,
  useStyles,
} from "../../../utils/helpers/colors";
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
  const styles = useStyles(makeStyles);
  const accentBorders = useAccentBorderColors();
  const isPrimary = variant === "primary";
  const iconColor = isPrimary ? "#fff" : brandColor;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary
          ? [
              styles.primaryButton,
              disabled
                ? styles.primaryButtonDisabled
                : { backgroundColor: brandColor },
            ]
          : [styles.secondaryButton, { borderColor: accentBorders.red }],
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={iconName} size={18} color={iconColor} />
      <Text
        style={[
          styles.label,
          isPrimary
            ? styles.primaryLabel
            : [styles.secondaryLabel, { color: brandColor }],
          textStyle,
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    button: {
      paddingVertical: 10,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    secondaryButton: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.redBorder,
    },
    primaryButton: {},
    primaryButtonDisabled: {
      backgroundColor: c.borderStrong,
    },
    label: {
      fontSize: 16,
      fontWeight: "700",
    },
    primaryLabel: {
      color: "#fff",
    },
    secondaryLabel: {},
  });
