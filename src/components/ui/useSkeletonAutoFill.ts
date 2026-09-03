import React from "react";
import { LayoutChangeEvent, useWindowDimensions } from "react-native";
import { Animated, Easing } from "react-native";

const PULSE_DURATION = 700;

/**
 * Phần dùng chung của mọi khung chờ dạng danh sách: đếm số thẻ vừa đủ phủ kín
 * khung, và nhịp nhấp nháy.
 *
 * Tách ra vì hai khung chờ (`MenuCardSkeleton` cho thẻ menu, `RecordCardSkeleton`
 * cho thẻ bản ghi) chỉ khác nhau ở hình dáng một thẻ — nếu mỗi bên tự đo tự đếm
 * thì sửa cách đo một bên là hai màn lệch nhịp nhau.
 *
 * `rowHeight` là chiều cao một thẻ **kể cả khoảng cách xuống thẻ dưới**.
 */
export function useSkeletonAutoFill(rowHeight: number, rows?: number) {
  const pulse = React.useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();
  /** Chiều cao khung đo được; trước khi đo xong thì tạm lấy chiều cao màn hình. */
  const [boxHeight, setBoxHeight] = React.useState(0);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;

    // Chênh dưới 1px là sai số làm tròn, đổi state sẽ render lại vô ích.
    setBoxHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
  }, []);

  React.useEffect(() => {
    const fade = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: PULSE_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const animation = Animated.loop(Animated.sequence([fade(1), fade(0)]));
    animation.start();

    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return {
    onLayout,
    opacity,
    rowCount:
      rows ?? Math.max(1, Math.ceil((boxHeight || windowHeight) / rowHeight)),
  };
}
