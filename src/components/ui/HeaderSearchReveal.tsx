import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";

type HeaderSearchRevealProps = {
  /** `open` của `useHeaderSearch`. */
  open: boolean;
  /** Ô tìm (kèm lề / khung bọc riêng của màn). Đóng hẳn thì không vẽ. */
  children: React.ReactNode;
  /**
   * Khoảng hở dưới ô, thu về 0 cùng ô — thay cho lề trên mà hàng bên dưới chỉ
   * có lúc ô đang mở (dòng đếm kết quả…).
   */
  gap?: number;
};

const REVEAL_MS = 220;

/**
 * Khung của ô tìm ẩn sau nút kính lúp (`useHeaderSearch`): mở thì ô trượt xuống
 * từ mép header, nội dung bên dưới dịch xuống theo; đóng thì trượt ngược lên
 * rồi mới gỡ ô.
 *
 * Thay cho `LayoutAnimation` (30/10/2026): Android (kiến trúc cũ) làm mờ dần
 * khối bị gỡ nhưng bóng `elevation` của ô không mờ theo — đóng rồi còn vệt bóng
 * — lại giật vì trùng lúc bàn phím hạ. Ở đây không đổi độ mờ: chiều cao khung
 * chạy 0 ↔ cao thật và cắt phần thừa, ô trượt theo; mở xong thì bỏ cắt cho
 * bóng ô hiện đủ.
 */
export default function HeaderSearchReveal({
  children,
  gap = 0,
  open,
}: HeaderSearchRevealProps) {
  const [mounted, setMounted] = useState(open);
  const [settled, setSettled] = useState(open);
  const [height, setHeight] = useState(0);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  // Đích của lượt chạy gần nhất: bấm đóng giữa lúc đang mở thì vẫn chạy ngược.
  const target = useRef(open ? 1 : 0);
  const measured = height > 0;

  useEffect(() => {
    if (open && !mounted) {
      setMounted(true);
      return undefined;
    }
    // Chưa đo được chiều cao thì chưa biết trượt bao xa.
    if (!mounted || !measured) return undefined;

    const toValue = open ? 1 : 0;
    if (target.current === toValue) return undefined;
    target.current = toValue;
    setSettled(false);

    const animation = Animated.timing(progress, {
      toValue,
      duration: REVEAL_MS,
      easing: Easing.out(Easing.cubic),
      // Chạy theo chiều cao (layout) nên không dùng native driver được.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      if (open) setSettled(true);
      else setMounted(false);
    });

    return () => animation.stop();
  }, [measured, mounted, open, progress]);

  if (!mounted) return null;

  const onContentLayout = (event: LayoutChangeEvent) =>
    setHeight(event.nativeEvent.layout.height);

  // Cây view giữ nguyên lúc chạy lẫn lúc đứng yên, chỉ đổi style: đổi cấu trúc
  // là ô nhập bị gắn lại, `autoFocus` bật bàn phím lần nữa giữa lúc đang đóng.
  // `collapsable={false}`: đứng yên thì hai khung chỉ còn bố cục, Android sẽ gộp
  // mất rồi dựng lại khi chạy — cũng là gắn lại ô nhập.
  return (
    <Animated.View
      collapsable={false}
      style={
        settled
          ? null
          : [
              styles.clip,
              {
                height: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, height],
                }),
              },
            ]
      }
    >
      <Animated.View
        collapsable={false}
        onLayout={onContentLayout}
        style={[
          gap ? { paddingBottom: gap } : null,
          // Đang trượt: thả nổi để khung ngoài (cao 0 lúc mới mở) không ép ô
          // về 0 — đo được chiều cao thật mới biết trượt bao xa.
          settled
            ? null
            : {
                ...styles.floating,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-height, 0],
                    }),
                  },
                ],
              },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  floating: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
