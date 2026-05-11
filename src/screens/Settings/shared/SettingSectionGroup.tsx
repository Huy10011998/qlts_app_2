import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "../../../utils/helpers/colors";

type SettingSectionGroupProps = {
  title?: string;
  children: React.ReactNode;
};

export default function SettingSectionGroup({
  title,
  children,
}: SettingSectionGroupProps) {
  return (
    <View style={styles.group}>
      {title ? (
        <View style={styles.titleRow}>
          <View style={styles.titleLine} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleLine} />
        </View>
      ) : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  titleLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
