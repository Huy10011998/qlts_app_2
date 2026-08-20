import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import IsLoading from "./IconLoading";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { elevation } from "../../utils/helpers/tokens";

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Mặc định nút xoá gọi `onChangeText("")`; truyền vào khi màn cần dọn thêm. */
  onClear?: () => void;
  /** Đang gọi API tìm kiếm: hiện spinner thay cho nút xoá. */
  isSearching?: boolean;
  /** Màu spinner. Mặc định đỏ thương hiệu. */
  spinnerColor?: string;
  /**
   * `card` (mặc định): nền surface, viền mảnh, bóng nhẹ — dùng khi ô nằm trên
   * nền trang. `plain`: nền xám nhạt, không viền không bóng, thấp hơn — dùng
   * trong bottom sheet, nơi đã có nền trắng của sheet đỡ phía sau.
   */
  variant?: "card" | "plain";
  /** Lề/khoảng cách riêng của từng màn. */
  style?: StyleProp<ViewStyle>;
  /** Giới hạn phóng chữ, cho các màn có lưới chật. */
  maxFontSizeMultiplier?: number;
  /** Đặt false ở nơi chiều cao cố định không chịu được cỡ chữ hệ thống lớn. */
  allowFontScaling?: boolean;
};

/**
 * Thanh tìm kiếm dùng chung: icon kính lúp, ô nhập, spinner khi đang tìm và nút
 * xoá khi đã có chữ.
 *
 * Trước đây mỗi màn tự dựng lại đúng khối này (danh sách tài sản, menu tài sản,
 * menu camera, hai picker modal, điểm danh cổ đông, sheet tuỳ chỉnh Trang chủ) —
 * tám bản gần như giống hệt, khác nhau vài pt bóng đổ, nên mỗi lần chỉnh một chi
 * tiết là phải sửa tám chỗ và luôn sót.
 *
 * Phần bố cục quanh ô (lề, badge số kết quả, dòng tóm tắt) vẫn thuộc về màn gọi:
 * mỗi màn một kiểu, gom vào đây chỉ đẻ thêm props.
 */
export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  onClear,
  isSearching = false,
  spinnerColor,
  variant = "card",
  style,
  maxFontSizeMultiplier,
  allowFontScaling,
}: SearchBarProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const isCard = variant === "card";

  return (
    <View
      style={[
        styles.box,
        isCard
          ? [styles.cardBox, { borderColor: hairlineBorderColor }]
          : styles.plainBox,
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="search-outline" size={20} color={c.textSub} />
      </View>

      <TextInput
        style={[styles.input, isCard ? styles.cardInput : styles.plainInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        clearButtonMode="never"
        returnKeyType="search"
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        allowFontScaling={allowFontScaling}
        accessibilityLabel={placeholder}
      />

      {isSearching ? (
        <View style={styles.spinnerWrap}>
          <IsLoading size="small" color={spinnerColor ?? c.red} />
        </View>
      ) : null}

      {!isSearching && value.length > 0 ? (
        <Pressable
          onPress={onClear ?? (() => onChangeText(""))}
          style={styles.clearButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Xoá từ khoá"
        >
          <Ionicons name="close-circle" size={16} color={c.placeholder} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    box: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
    },
    cardBox: {
      backgroundColor: c.surface,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 1),
    },
    plainBox: {
      backgroundColor: c.surfaceAlt,
      minHeight: 42,
      borderRadius: 12,
    },
    // Ô chứa rộng hơn glyph 20pt một chút để chữ ký tự không chạm mép.
    iconWrap: {
      marginRight: 8,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      fontSize: 14,
      color: c.text,
      fontWeight: "400",
      textAlignVertical: "center",
    },
    cardInput: {
      minHeight: 48,
    },
    plainInput: {
      minHeight: 42,
    },
    spinnerWrap: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 6,
    },
    clearButton: {
      padding: 4,
      marginLeft: 4,
    },
  });
