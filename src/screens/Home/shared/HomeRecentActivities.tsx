import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "../../../utils/helpers/colors";

type HomeRecentActivityItem = {
  text: string;
  time: string;
  dot: string;
};

type HomeRecentActivitiesProps = {
  items: HomeRecentActivityItem[];
};

export default function HomeRecentActivities({
  items,
}: HomeRecentActivitiesProps) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View
          key={`${item.text}-${index}`}
          style={[styles.row, index === items.length - 1 && styles.rowLast]}
        >
          <View style={[styles.dot, { backgroundColor: item.dot }]} />
          <Text style={styles.text} numberOfLines={1} allowFontScaling={false}>
            {item.text}
          </Text>
          <Text style={styles.time} allowFontScaling={false}>
            {item.time}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    color: C.textSecondary,
    fontWeight: "600",
  },
  time: {
    fontSize: 11.5,
    lineHeight: 15,
    color: C.textMuted,
    fontWeight: "600",
  },
});
