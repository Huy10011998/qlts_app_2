import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";

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
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const separatorColor = useSeparatorColor();
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
      {items.map((item, index) => (
        <View
          key={`${item.text}-${index}`}
          style={[
            styles.row,
            { borderBottomColor: separatorColor },
            index === items.length - 1 && styles.rowLast,
          ]}
        >
          <View style={[styles.dot, { backgroundColor: item.dot }]} />
          <Text
            style={[styles.text, { color: colors.textSecondary }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {item.text}
          </Text>
          <Text
            style={[styles.time, { color: colors.textMuted }]}
            allowFontScaling={false}
          >
            {item.time}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 4,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
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
      color: c.textSecondary,
      fontWeight: "600",
    },
    time: {
      fontSize: 11.5,
      lineHeight: 15,
      color: c.textMuted,
      fontWeight: "600",
    },
  });
