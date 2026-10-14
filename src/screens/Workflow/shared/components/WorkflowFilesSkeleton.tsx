import React from "react";
import { StyleSheet, View } from "react-native";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonAutoFill } from "../../../../components/ui/useSkeletonAutoFill";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";

/** Thẻ `row` (paddingVertical 4) + dòng `WorkflowFileRow` (8 + icon 36 + 8) + marginBottom 8. */
const ROW_HEIGHT = 4 + 8 + 36 + 8 + 4 + 8;

/**
 * Khung chờ danh sách file đính kèm (`WorkflowFilesScreen`): mỗi thẻ là ô icon
 * + tên file + dòng phụ (dung lượng · người tải · giờ), đủ số thẻ phủ kín màn.
 */
export default function WorkflowFilesSkeleton() {
  const styles = useStyles(makeStyles);
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(ROW_HEIGHT);

  return (
    <View style={styles.wrap} onLayout={onLayout} accessibilityLabel="Đang tải file">
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonBlock opacity={opacity} style={styles.icon} />
          <View style={styles.body}>
            <SkeletonBlock
              opacity={opacity}
              style={[styles.name, index % 3 === 1 && styles.nameShort]}
            />
            <SkeletonBlock opacity={opacity} style={styles.meta} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Số đo của `WorkflowFilesScreen` (`row`) và `WorkflowFileRow`.
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      padding: 12,
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      marginRight: 10,
    },
    body: {
      flex: 1,
      gap: 7,
    },
    name: {
      width: "64%",
      height: 13,
      borderRadius: 6,
    },
    nameShort: {
      width: "46%",
    },
    meta: {
      width: "78%",
      height: 10,
      borderRadius: 5,
    },
  });
