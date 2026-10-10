import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import {
  COMPACT_TEXT_MAX_SCALE,
  READABLE_TEXT_MAX_SCALE,
} from "../../../../utils/helpers/textScaling";

export type WorkflowButtonVariant =
  | "primary"
  | "success"
  | "danger"
  | "neutral"
  | "outline";

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: WorkflowButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Chiếm phần còn lại của hàng (nút trong footer). */
  flex?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_COLORS: Record<WorkflowButtonVariant, (c: AppColors) => { bg: string; fg: string; border: string }> = {
  primary: (c) => ({ bg: c.red, fg: c.onBrand, border: c.red }),
  success: () => ({ bg: "#2eb85c", fg: "#FFFFFF", border: "#2eb85c" }),
  danger: () => ({ bg: "#5c6873", fg: "#FFFFFF", border: "#5c6873" }),
  // Nền trắng + viền xám: nền xám nhạt cũ (surfaceAlt) gần trùng nền trang,
  // nút trông như chữ trơn.
  neutral: (c) => ({ bg: c.surface, fg: c.textSecondary, border: c.borderStrong }),
  outline: (c) => ({ bg: c.surface, fg: c.red, border: c.red }),
};

/** Nút thao tác của view Workflow (footer sheet, thanh nút màn chi tiết). */
export default function WorkflowButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled,
  loading,
  flex,
  compact,
  style,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const colors = VARIANT_COLORS[variant](c);
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={inactive}
      style={[
        styles.button,
        compact && styles.compact,
        flex && styles.flex,
        { backgroundColor: colors.bg, borderColor: colors.border },
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={compact ? 14 : 17} color={colors.fg} />
      ) : null}
      {/* Ba nút chia đều một hàng (Từ chối · Không ý kiến · Duyệt): nhãn dài
          tự thu chữ thay vì bị cắt thành "Không ý k...". */}
      <Text
        style={[styles.label, compact && styles.labelCompact, { color: colors.fg }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        // Nút nhỏ xếp nhiều trên một hàng: kẹp trần thấp như chip, khỏi phình.
        maxFontSizeMultiplier={compact ? COMPACT_TEXT_MAX_SCALE : READABLE_TEXT_MAX_SCALE}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    compact: {
      minHeight: 30,
      paddingHorizontal: 10,
      borderRadius: 9,
      gap: 4,
    },
    flex: {
      flex: 1,
      paddingHorizontal: 10,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "700",
    },
    labelCompact: {
      fontSize: 12,
    },
  });
