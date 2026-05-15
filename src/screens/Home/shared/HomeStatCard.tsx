import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";

const trendStyles = StyleSheet.create({
  up: {
    backgroundColor: "#E8FBF3",
  },
  down: {
    backgroundColor: "#FFF0F0",
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
  subColor = "#aaa",
  iconName,
  iconBg,
  iconColor,
  trend,
}: HomeStatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} color={iconColor} size={16} />
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
      <Text style={[styles.value, { color: iconColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={[styles.sub, { color: subColor }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  sub: {
    fontSize: 9.5,
    marginTop: 5,
    fontWeight: "500",
  },
});
