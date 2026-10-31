import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Hiện dần + nhích lên một chút khi được gắn vào. Thẻ ngày dưới lưới Tháng đổi
 * `key` theo ngày đang chọn nên mỗi lần bấm ngày khác là thẻ mới mờ dần vào.
 */
export default function LichFadeIn({ children }: { children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
