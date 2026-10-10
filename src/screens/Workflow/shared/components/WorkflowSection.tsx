import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";

type Props = {
  title?: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Khung thẻ có tiêu đề, dùng cho các khối vẽ riêng ở màn chi tiết / form. */
export default function WorkflowSection({ title, icon, right, children, style }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={15} color={c.red} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 1),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
  });
