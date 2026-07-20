import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { HOME_BRAND_RED } from "./homeTheme";
import { C, useAppColors } from "../../../utils/helpers/colors";

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
  const colors = useAppColors();
  const handleActionPress =
    onAction ??
    (() => {
      Alert.alert(
        "Thông báo",
        "Chức năng sẽ được triển khai trong thời gian sắp tới."
      );
    });

  return (
    <View style={styles.row}>
      <View style={styles.pill} />
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
      {action ? (
        <TouchableOpacity onPress={handleActionPress}>
          <Text style={styles.action} allowFontScaling={false}>
            {action}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
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
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
  action: {
    fontSize: 11,
    color: HOME_BRAND_RED,
    fontWeight: "600",
  },
});
