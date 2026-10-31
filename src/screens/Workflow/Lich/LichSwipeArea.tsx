import React, { useEffect, useMemo, useRef } from "react";
import { Animated, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { slideToPeriod } from "./lichSlide";

/** Kéo quá chừng này px, hoặc hất nhanh, rồi thả = sang kỳ khác. */
const SWIPE_THRESHOLD = 64;
const SWIPE_VELOCITY = 650;

type Props = {
  /** 1 = kỳ sau (vuốt sang trái), -1 = kỳ trước (vuốt sang phải). */
  onSwipe: (step: 1 | -1) => void;
  /**
   * Giá trị trượt do màn giữ: màn Lịch đổi `key` của ScrollView theo khoảng nên
   * vùng vuốt bị dựng lại ngay khi sang kỳ mới — giá trị riêng của bản cũ mất
   * theo, kỳ mới không trượt vào được.
   */
  translateX: Animated.Value;
  children: React.ReactNode;
};

/**
 * Vuốt ngang để sang tháng / tuần khác, như lịch của điện thoại: nội dung trượt
 * theo tay, qua ngưỡng thì trượt hẳn ra rồi kỳ mới trượt vào từ phía bên kia;
 * chưa qua thì bật về chỗ cũ. Kéo dọc nhường cho danh sách cuộn. Nút ‹ › vẫn
 * giữ — vuốt chỉ là đường tắt.
 *
 * Như `ReplySwipeRow`: dự án không cài reanimated nên cử chỉ chạy ở luồng JS và
 * lái Animated thường.
 */
export default function LichSwipeArea({ onSwipe, translateX, children }: Props) {
  const { width } = useWindowDimensions();
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          translateX.setValue(event.translationX);
        })
        .onEnd((event) => {
          const passed =
            Math.abs(event.translationX) > SWIPE_THRESHOLD ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY;
          const step: 1 | -1 = event.translationX < 0 ? 1 : -1;
          // Chưa qua ngưỡng, hoặc lượt trước (nút ‹ ›) chưa trượt xong: bật về chỗ.
          if (
            passed &&
            slideToPeriod(translateX, width, step, (s) => onSwipeRef.current(s))
          ) {
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();
        })
        // Cử chỉ bị ngắt giữa chừng (không qua onEnd): trả nội dung về chỗ.
        .onFinalize((_event, success) => {
          if (success) return;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();
        }),
    [translateX, width],
  );

  const opacity = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.2, 1, 0.2],
    extrapolate: "clamp",
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ opacity, transform: [{ translateX }] }}>{children}</Animated.View>
    </GestureDetector>
  );
}
