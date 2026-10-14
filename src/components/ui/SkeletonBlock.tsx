import React from "react";
import { Animated, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { useAppColors } from "../../utils/helpers/colors";
import { useSkeletonPulse } from "./useSkeletonAutoFill";

/**
 * Một khối xám nhấp nháy của khung chờ — vạch chữ, ô ảnh, nút, avatar. Kích
 * thước và bo góc do `style` quyết định; màu luôn là `c.skeleton` để mọi khung
 * chờ cùng một tông ở cả hai chế độ sáng / tối.
 *
 * `opacity` lấy từ `useSkeletonPulse` (hoặc `useSkeletonAutoFill`) của khung chờ
 * chứa nó, để mọi khối sáng tối cùng nhịp.
 */
export default function SkeletonBlock({
  opacity,
  style,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useAppColors();

  return <Animated.View style={[{ backgroundColor: c.skeleton, opacity }, style]} />;
}

/**
 * Khối xám tự nhấp nháy, phủ kín khung chứa (mặc định) — cho ô ảnh / thumbnail
 * đang tải nằm lẻ một mình, không thuộc khung chờ nào để mượn nhịp.
 *
 * Chỉ render lúc đang tải: nhịp chạy theo vòng đời component, gỡ ra là dừng.
 */
export function SkeletonFill({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSkeletonPulse();

  return (
    <SkeletonBlock
      opacity={opacity}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
