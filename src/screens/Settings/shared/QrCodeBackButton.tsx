import React from "react";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  /** Màu mũi tên — nền đỏ thì trắng, nền sáng của lỗi/khung chờ thì màu chữ. */
  tint: string;
  /** Nền tròn sau mũi tên. Bỏ trống là không vẽ nền. */
  backgroundColor?: string;
};

/**
 * Nút quay lại của màn Thông tin QrCode.
 *
 * Màn tắt header (`headerShown: false`) để nền tràn hết màn, nên mọi trạng thái
 * — card, khung chờ, màn lỗi — đều phải tự vẽ nút này; thiếu ở trạng thái nào là
 * người dùng Android kẹt ở đó.
 *
 * Đặt ở góc PHẢI vì góc trái đã có mã QR.
 */
export default function QrCodeBackButton({ tint, backgroundColor }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel="Quay lại"
      accessibilityRole="button"
      hitSlop={12}
      onPress={() => navigation.goBack()}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + 8 },
        backgroundColor ? { backgroundColor } : null,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="chevron-back" size={24} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 14,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
