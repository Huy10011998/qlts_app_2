import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  C,
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";

const trendStyles = StyleSheet.create({
  up: {
    backgroundColor: C.greenLight,
  },
  down: {
    backgroundColor: C.redSurface,
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
  subColor = C.textMuted,
  iconName,
  iconBg,
  iconColor,
  trend,
}: HomeStatCardProps) {
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hairlineBorderColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} color={iconColor} size={16} />
          </View>
          <Text
            style={[styles.label, { color: colors.textSecondary }]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </View>
        {trend === "up" ? (
          <View style={[styles.trendBadge, trendStyles.up]}>
            <Ionicons name="trending-up" size={10} color="#10B981" />
          </View>
        ) : null}
        {trend === "down" ? (
          <View style={[styles.trendBadge, trendStyles.down]}>
            <Ionicons name="trending-down" size={10} color={C.red} />
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
          style={[styles.sub, { color: subColor }]}
          allowFontScaling={false}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    shadowColor: C.shadow,
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
    color: C.textSecondary,
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
