import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { HOME_BRAND_RED } from "./homeTheme";

type HomeSectionTitleProps = {
  label: string;
  action?: string;
  onAction?: () => void;
};

export default function HomeSectionTitle({
  label,
  action,
  onAction,
}: HomeSectionTitleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.pill} />
      <Text style={styles.label}>{label}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  pill: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: HOME_BRAND_RED,
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  action: {
    fontSize: 11,
    color: HOME_BRAND_RED,
    fontWeight: "600",
  },
});
