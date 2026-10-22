import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import {
  AppColors,
  C,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";

type PickerSheetFrameProps = {
  /** Nhãn nút trái. Mặc định "Huỷ"; sheet con quay về sheet trước thì "Quay lại". */
  cancelLabel?: string;
  children: React.ReactNode;
  /**
   * Dòng lớn trên đầu sheet (ngày đang chọn). Có thì `title` lùi xuống thành
   * dòng nhãn nhỏ phía trên, kiểu tiêu đề bộ chọn ngày của Material 3.
   */
  headline?: string;
  onCancel: () => void;
  /** Có thì hiện nút "Xoá" ở góc phải tiêu đề — bỏ trống ô (trường không bắt buộc). */
  onClear?: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

/**
 * Khung chung của bộ chọn ngày / giờ tự vẽ: sheet trượt từ đáy, tiêu đề, nội
 * dung, hai nút Huỷ – Xác nhận chia đôi bề ngang.
 *
 * Bấm ra ngoài hay nút back của máy đều tính là Huỷ.
 */
export default function PickerSheetFrame({
  cancelLabel = "Huỷ",
  children,
  headline,
  onCancel,
  onClear,
  onConfirm,
  title,
  visible,
}: PickerSheetFrameProps) {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onCancel}
      closeOnBackdropPress
      showHandle
      sheetStyle={styles.sheet}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          {headline ? (
            <>
              <Text style={styles.overline}>{title}</Text>
              <Text style={styles.headline} numberOfLines={1}>
                {headline}
              </Text>
            </>
          ) : (
            <Text style={styles.headline}>{title}</Text>
          )}
        </View>
        {onClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xoá giá trị đang có"
            onPress={onClear}
            hitSlop={8}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>Xoá</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.divider, { backgroundColor: separatorColor }]} />

      <View style={styles.body}>{children}</View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && Platform.OS === "ios" && styles.pressed,
          ]}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          android_ripple={{ color: "rgba(255,255,255,0.22)" }}
          style={({ pressed }) => [
            styles.button,
            styles.confirmButton,
            pressed && Platform.OS === "ios" && styles.pressed,
          ]}
        >
          <Text style={styles.confirmText}>Xác nhận</Text>
        </Pressable>
      </View>
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      // Máy tính bảng: lịch 7 cột trải hết bề ngang thì mỗi ô rộng cả trăm dp,
      // nhìn lỏng lẻo. Giới hạn như sheet của Material 3 và đặt giữa màn.
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 14,
    },
    headerText: {
      flex: 1,
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    clearText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    overline: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSub,
      marginBottom: 4,
    },
    headline: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    button: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      // Gợn sóng của Android phải nằm gọn trong góc bo.
      overflow: "hidden",
    },
    cancelButton: {
      backgroundColor: c.surfaceAlt,
    },
    confirmButton: {
      backgroundColor: C.red,
    },
    pressed: {
      opacity: 0.75,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.textSecondary,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: "700",
      color: C.onBrand,
    },
  });
