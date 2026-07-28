import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";

const makeTrendStyles = (c: AppColors) =>
  StyleSheet.create({
    up: {
      backgroundColor: c.greenLight,
    },
    down: {
      backgroundColor: c.redSurface,
    },
  });

type HomeStatCardProps = {
  value: string;
  label: string;
  sub?: string;
  subColor?: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
};

export default function HomeStatCard({
  value,
  label,
  sub,
  subColor,
  iconName,
  iconBg,
  iconColor,
  trend,
}: HomeStatCardProps) {
  const trendStyles = useStyles(makeTrendStyles);
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const resolvedSubColor = subColor ?? c.textMuted;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: hairlineBorderColor,
          shadowColor: c.shadow,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} color={iconColor} size={16} />
          </View>
          <Text
            style={[styles.label, { color: c.textSecondary }]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </View>
        {trend === "up" ? (
          <View style={[styles.trendBadge, trendStyles.up]}>
            <Ionicons name="trending-up" size={10} color={c.emerald} />
          </View>
        ) : null}
        {trend === "down" ? (
          <View style={[styles.trendBadge, trendStyles.down]}>
            <Ionicons name="trending-down" size={10} color={c.red} />
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.value, { color: iconColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        allowFontScaling={false}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={[styles.sub, { color: resolvedSubColor }]}
          allowFontScaling={false}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    top: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingRight: 8,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    trendBadge: {
      width: 22,
      height: 22,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    label: {
      fontSize: 13,
      lineHeight: 17,
      color: c.textSecondary,
      fontWeight: "700",
      flex: 1,
    },
    sub: {
      fontSize: 11.5,
      lineHeight: 15,
      marginTop: 5,
      fontWeight: "600",
    },
  });
