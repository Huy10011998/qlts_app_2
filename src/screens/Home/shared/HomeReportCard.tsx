import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  AppColors,
  useAccentBorderColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";

export const HOME_REPORT_CARD_MIN_HEIGHT = 118;

const REPORT_ACCENT_COLOR = "#7048E8";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type HomeReportCardProps = {
  index?: number;
  label: string;
  onPress?: () => void;
};

export default function HomeReportCard({
  index = 0,
  label,
  onPress,
}: HomeReportCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const accentBorders = useAccentBorderColors();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 80,
      tension: 55,
      friction: 7,
    }).start();
  }, [index, scaleAnim]);

  return (
    <AnimatedTouchable
      style={[
        styles.reportCard,
        {
          backgroundColor: colors.surface,
          borderColor: accentBorders.violet,
          shadowColor: colors.shadow,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      activeOpacity={0.76}
      onPress={onPress}
    >
      <View
        style={[styles.reportIconWrap, { backgroundColor: colors.violetSurface }]}
      >
        <Ionicons
          name="document-text-outline"
          size={21}
          color={REPORT_ACCENT_COLOR}
        />
      </View>

      <View style={styles.reportTextWrap}>
        <Text
          style={[styles.reportTitle, { color: colors.text }]}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      <View
        style={[
          styles.reportArrowWrap,
          { backgroundColor: colors.violetSurface },
        ]}
      >
        <Ionicons
          name="arrow-forward"
          size={12}
          color={REPORT_ACCENT_COLOR}
        />
      </View>
    </AnimatedTouchable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    reportCard: {
      flex: 1,
      minHeight: HOME_REPORT_CARD_MIN_HEIGHT,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: c.violetBorder,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    reportIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.violetSurface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    reportTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    reportTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      lineHeight: 17,
      minHeight: 34,
      marginBottom: 6,
    },
    reportArrowWrap: {
      position: "absolute",
      right: 12,
      bottom: 12,
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: c.violetSurface,
      alignItems: "center",
      justifyContent: "center",
    },
  });
