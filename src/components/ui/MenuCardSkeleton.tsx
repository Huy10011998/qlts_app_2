import React from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import {
  AppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";

const PULSE_DURATION = 700;

/**
 * Khung xám nhấp nháy đúng hình dáng thẻ menu, dùng trong lúc tải.
 *
 * Thay cho vòng xoay giữa màn trắng: người dùng thấy ngay bố cục sắp hiện ra nên
 * cảm giác nhanh hơn, dù thời gian tải không đổi. Dùng cho mọi màn danh sách thẻ
 * (cây tài sản, cây camera).
 */
export default function MenuCardSkeleton({ rows = 8 }: { rows?: number }) {
  const styles = useStyles(makeStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  const pulse = React.useRef(new Animated.Value(0)).current;

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

  return (
    <View style={styles.wrap} accessibilityLabel="Đang tải danh sách">
      {Array.from({ length: rows }).map((_, index) => (
        <Animated.View
          key={index}
          style={[styles.card, { borderColor: hairlineBorderColor, opacity }]}
        >
          <View style={styles.icon} />
          <View style={styles.lines}>
            {/* Dòng nhãn dài ngắn khác nhau cho giống danh sách thật. */}
            <View style={[styles.line, index % 3 === 0 && styles.lineShort]} />
          </View>
          <View style={styles.chevron} />
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 58,
      marginBottom: 6,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    lines: {
      flex: 1,
    },
    line: {
      height: 12,
      width: "62%",
      borderRadius: 6,
      backgroundColor: c.surfaceAlt,
    },
    lineShort: {
      width: "42%",
    },
    chevron: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: c.surfaceAlt,
    },
  });
