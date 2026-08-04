import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { C } from "../../utils/helpers/colors";
import { TAB_HEIGHT } from "./tabBarTheme";

// Vòng tròn nằm gọn trong chiều cao thanh tab thay vì nhô lên trên nó. Nút nhô
// lên đẹp hơn, nhưng phần nhô ra nằm ngoài bounds của view cha, và trên Android
// vùng đó không nhận touch — thành nút bấm không được ở đúng nửa trên.
const SCAN_BUTTON_SIZE = 46;

export default function ScanTabButton({
  accessibilityState,
  onPress,
}: BottomTabBarButtonProps) {
  const isFocused = accessibilityState?.selected === true;

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Quét QR"
      accessibilityState={accessibilityState}
    >
      <View style={[styles.circle, isFocused && styles.circleFocused]}>
        <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: SCAN_BUTTON_SIZE / 2,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.red,
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  circleFocused: {
    // Đang ở màn quét thì thanh tab chuyển sang nền tối; viền sáng giữ cho nút
    // không chìm vào nền.
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
});
