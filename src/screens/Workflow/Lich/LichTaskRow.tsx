import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { CongViecItem } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { getMaMauColor } from "../shared/workflowConstants";
import { formatTaskTime } from "./lichHelpers";

type Props = {
  item: CongViecItem;
  onPress: () => void;
};

/**
 * Một việc trên lịch: ô màu nền theo maMau, viền trái theo màu loại công việc
 * (mauLoai, null thì bỏ viền), giờ, tiêu đề, số + chủ trì.
 */
export default function LichTaskRow({ item, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const color = getMaMauColor(item.maMau);

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.row}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: color },
          item.mauLoai ? [styles.loaiBorder, { borderLeftColor: item.mauLoai }] : null,
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.time}>{formatTaskTime(item)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.tieuDe}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.soCongViec, item.chuTri_MoTa].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
    },
    swatch: {
      width: 10,
    },
    loaiBorder: {
      borderLeftWidth: 4,
    },
    body: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    time: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSub,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginTop: 2,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
  });
