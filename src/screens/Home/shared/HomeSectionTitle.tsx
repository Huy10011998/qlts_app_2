import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HOME_BRAND_RED } from "./homeTheme";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";

type HomeSectionTitleProps = {
  label: string;
  action?: string;
  /** Icon Ionicons đứng trước chữ của nút hành động. */
  actionIconName?: string;
  onAction?: () => void;
  /** Chú thích phụ, ví dụ "Cập nhật 09:12". Hiển thị mờ, không bấm được. */
  note?: string;
};

export default function HomeSectionTitle({
  label,
  action,
  actionIconName,
  onAction,
  note,
}: HomeSectionTitleProps) {
  const styles = useStyles(makeStyles);
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
      {note ? (
        <Text
          style={[styles.note, { color: colors.textMuted }]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {note}
        </Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleActionPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          {actionIconName ? (
            <Ionicons name={actionIconName} size={13} color={HOME_BRAND_RED} />
          ) : null}
          <Text style={styles.action} allowFontScaling={false}>
            {action}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
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
      color: c.textSecondary,
      letterSpacing: 0.5,
    },
    note: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "600",
      marginLeft: 8,
      flexShrink: 0,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginLeft: 8,
      flexShrink: 0,
    },
    action: {
      fontSize: 11,
      color: HOME_BRAND_RED,
      fontWeight: "600",
    },
  });
