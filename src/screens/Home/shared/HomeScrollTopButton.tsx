import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useTabBarAutoHide } from "../../../navigation/shared/tabBarAutoHide";
import { useTabBarOverlap } from "../../../navigation/shared/tabBarTheme";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { HOME_BRAND_RED } from "./homeTheme";

type HomeScrollTopButtonProps = {
  visible: boolean;
  onPress: () => void;
};

/**
 * Nút tròn góc dưới bên phải Trang chủ: cuộn xuống quá một màn thì hiện, chạm là
 * trượt về đầu trang. Ngồi ngay trên viên thanh tab nổi (`useTabBarOverlap`);
 * thanh tab tự ẩn lúc cuộn (`tabBarAutoHide`) thì nút hạ xuống theo, đứng cách
 * mép dưới vùng an toàn 12 như lúc cách viên.
 */
export default function HomeScrollTopButton({
  visible,
  onPress,
}: HomeScrollTopButtonProps) {
  const styles = useStyles(makeStyles);
  const tabBarOverlap = useTabBarOverlap();
  const bottomInset = useSafeAreaInsets().bottom;
  const { progress: tabBarHideProgress } = useTabBarAutoHide();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  return (
    <Animated.View
      // Đang ẩn thì không được nuốt lượt chạm của card nằm bên dưới.
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.wrap,
        {
          bottom: tabBarOverlap + 12,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
            {
              translateY: tabBarHideProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.max(tabBarOverlap - bottomInset, 0)],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Lên đầu trang"
      >
        <Ionicons name="arrow-up" size={22} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      right: 16,
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: HOME_BRAND_RED,
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
  });
