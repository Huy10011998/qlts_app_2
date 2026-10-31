import React from "react";
import { StyleSheet, View } from "react-native";

import { TAB_HEIGHT } from "./tabBarTheme";

type TabBarBackgroundProps = {
  backgroundColor: string;
  borderTopColor: string;
};

/**
 * Nền của thanh tab: viên bo tròn nổi, viền mảnh + bóng nhẹ để tách khỏi nội
 * dung cuộn phía sau. Được truyền qua option `tabBarBackground` nên
 * react-navigation tự đặt nó phủ kín thanh tab và không nhận touch — và cũng
 * chính vì có nó mà react-navigation set `backgroundColor: "transparent"` cho
 * thanh tab, tức đây là chỗ DUY NHẤT vẽ nền.
 *
 * Nền là `backgroundColor` của View, không vẽ bằng SVG: SVG hụt một nhịp là
 * thanh tab trong suốt, nhìn xuyên xuống thấy nội dung phía sau (đã gặp trên
 * Android). Bóng cũng nằm ở đây chứ không ở thanh tab (xem `createTabBarStyle`).
 */
export default function TabBarBackground({
  backgroundColor,
  borderTopColor,
}: TabBarBackgroundProps) {
  return (
    <View
      style={[styles.capsule, { backgroundColor, borderColor: borderTopColor }]}
    />
  );
}

const styles = StyleSheet.create({
  capsule: {
    flex: 1,
    borderRadius: TAB_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
