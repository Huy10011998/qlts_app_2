import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { radius } from "../../../utils/helpers/tokens";

type CameraStatusChipProps = {
  isLive?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Badge trạng thái dùng chung cho mọi player camera để fullscreen và playback
 * luôn có cùng kích thước, font và vị trí chấm trạng thái.
 */
export default function CameraStatusChip({
  isLive = true,
  label,
  style,
}: CameraStatusChipProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.dot, !isLive && styles.dotIdle]} />
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 26,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.red,
    },
    dotIdle: { backgroundColor: "rgba(255,255,255,0.65)" },
    text: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
    },
  });
