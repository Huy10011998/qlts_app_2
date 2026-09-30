import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAction: () => void;
  actionIcon?: string;
};

// Cụm nút góc trái trên: phóng to, thu nhỏ, và nút về tuyến/vị trí.
export default function VehicleMapControls({
  onZoomIn,
  onZoomOut,
  onAction,
  actionIcon = "locate-outline",
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.group}>
        <TouchableOpacity style={styles.button} onPress={onZoomIn}>
          <Ionicons name="add" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.button} onPress={onZoomOut}>
          <Ionicons name="remove" size={24} color={c.text} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.group, styles.button]} onPress={onAction}>
        <Ionicons name={actionIcon} size={21} color="#1976d2" />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: { position: "absolute", top: 12, left: 12, gap: 10 },
    group: {
      borderRadius: 9,
      backgroundColor: c.surface,
      overflow: "hidden",
      elevation: 4,
      shadowColor: c.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
    button: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.borderStrong },
  });
