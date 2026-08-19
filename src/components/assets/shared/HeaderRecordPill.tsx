import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import React from "react";
import { Dimensions, Pressable, StyleSheet, Text } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/**
 * Pill mang mã bản ghi ở góc phải header (xem nút "bản ghi gốc" của
 * AssetRelatedList).
 *
 * Khác nút pill ở các màn form (`AssetFormHeaderSubmitButton`): nhãn ở đây là mã
 * do người dùng đặt, dài tuỳ ý — mã RFID có thể hơn 20 ký tự. Một dòng chữ 12 thì
 * cắt mất đuôi, mà cắt đuôi mã thì pill vô nghĩa. Nên: chữ nhỏ hơn, xuống được
 * hai dòng, và chặn bề rộng theo màn hình để tiêu đề còn chỗ — tiêu đề có
 * `adjustsFontSizeToFit` nên chỉ co chữ chứ không bị cắt.
 */
const MAX_WIDTH = Math.min(150, Dimensions.get("window").width * 0.4);

type HeaderRecordPillProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function HeaderRecordPill({
  label,
  onPress,
  disabled = false,
}: HeaderRecordPillProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    // Pressable chứ không TouchableOpacity — cùng lý do như
    // AssetFormHeaderSubmitButton: bấm là điều hướng, animation opacity của
    // TouchableOpacity bị bỏ dở giữa đường và nút đứng ở mức mờ.
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Mở bản ghi ${label}`}
    >
      <Ionicons name="pricetag-outline" size={14} color={c.red} />
      <Text
        style={styles.label}
        allowFontScaling={false}
        numberOfLines={2}
        // Mã là một chuỗi liền không có dấu cách: Android mặc định coi nó là một
        // "từ" và không ngắt giữa từ, nên phải hạ chiến lược ngắt dòng xuống mức
        // đơn giản mới xuống được dòng thứ hai.
        textBreakStrategy="simple"
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    button: {
      maxWidth: MAX_WIDTH,
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.7)",
    },
    buttonPressed: {
      opacity: 0.78,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    label: {
      flexShrink: 1,
      color: c.red,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: "800",
    },
  });
