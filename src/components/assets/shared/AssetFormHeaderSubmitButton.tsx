import { C } from "../../../utils/helpers/colors";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type AssetFormHeaderSubmitButtonProps = {
  iconName: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const createAssetFormHeaderSubmitRight =
  (props: AssetFormHeaderSubmitButtonProps) => () =>
    <AssetFormHeaderSubmitButton {...props} />;

export default function AssetFormHeaderSubmitButton({
  iconName,
  label,
  onPress,
  disabled = false,
  style,
}: AssetFormHeaderSubmitButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
    >
      <Ionicons name={iconName} size={16} color={C.red} />
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.7)",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  label: {
    color: C.red,
    fontSize: 12,
    fontWeight: "800",
  },
});
