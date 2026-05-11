import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
          <Text style={styles.text} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF0F5",
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
    fontSize: 11.5,
    color: "#374151",
    fontWeight: "400",
  },
  time: {
    fontSize: 10,
    color: "#9CA3AF",
  },
});
