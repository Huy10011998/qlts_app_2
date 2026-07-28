import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
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
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
    >
      <Ionicons name={iconName} size={16} color={c.red} />
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    button: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.7)",
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    label: {
      color: c.red,
      fontSize: 12,
      fontWeight: "800",
    },
  });
