import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { AppColors, useStyles } from "../../../../utils/helpers/colors";

type Props = { label: string };

const DOT_COUNT = 3;
const STEP_MS = 160;

/**
 * Cuối khung chat: bong bóng chữ nghiêng "{A} đang nhập" + 3 chấm nhảy lần
 * lượt (7-Mobile-Realtime-BinhLuan mục 4).
 */
export default function TypingIndicator({ label }: Props) {
  const styles = useStyles(makeStyles);
  const dots = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        STEP_MS,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: STEP_MS * 2, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: STEP_MS * 2, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    loop.start();
    return () => loop.stop();
  }, [dots]);

  return (
    <View style={styles.row} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <View style={styles.bubble}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.dots}>
          {dots.map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [
                    { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      marginBottom: 10,
    },
    bubble: {
      maxWidth: "82%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderTopLeftRadius: 4,
      backgroundColor: c.surface,
    },
    label: {
      flexShrink: 1,
      fontSize: 13,
      fontStyle: "italic",
      color: c.textSub,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingTop: 3,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.textSub,
    },
  });
