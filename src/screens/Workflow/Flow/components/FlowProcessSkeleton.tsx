import React from "react";
import { StyleSheet, View } from "react-native";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";

/** Số điểm dựng sẵn trên sơ đồ: vừa một màn hẹp, đủ ra dáng một quy trình. */
const DIAGRAM_POINTS = 3;
const HISTORY_ROWS = 4;

/**
 * Khung chờ phần nội dung màn Quy trình (`FlowProcessScreen`). Thanh tab và chú
 * thích màu là thật — chỉ phần phụ thuộc tiến trình mới dựng xám:
 * - tab Quy trình: một lượt chạy vài điểm nối nhau + khung chi tiết điểm đang chọn;
 * - tab Lịch sử: các mốc thời gian trên một đường dọc.
 */
export default function FlowProcessSkeleton({ tab }: { tab: "quyTrinh" | "lichSu" }) {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();

  if (tab === "lichSu") {
    return (
      <View accessibilityLabel="Đang tải lịch sử">
        {Array.from({ length: HISTORY_ROWS }).map((_, index) => (
          <View key={index} style={styles.historyRow}>
            <View style={styles.rail}>
              <SkeletonBlock opacity={opacity} style={styles.railDot} />
              {index < HISTORY_ROWS - 1 ? <View style={styles.railLine} /> : null}
            </View>
            <View style={styles.historyBody}>
              <SkeletonBlock opacity={opacity} style={[styles.bar, styles.historyTitle]} />
              <SkeletonBlock opacity={opacity} style={[styles.bar, styles.w44]} />
              <SkeletonBlock opacity={opacity} style={[styles.bar, styles.historyTime]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View accessibilityLabel="Đang tải quy trình">
      <View style={styles.diagramCard}>
        {Array.from({ length: DIAGRAM_POINTS }).map((_, index) => (
          <View key={index} style={styles.cell}>
            <View style={styles.dotRow}>
              <SkeletonBlock opacity={opacity} style={styles.dot} />
              {index < DIAGRAM_POINTS - 1 ? <View style={styles.connector} /> : null}
            </View>
            <SkeletonBlock opacity={opacity} style={[styles.bar, styles.name]} />
            <SkeletonBlock opacity={opacity} style={[styles.bar, styles.sub]} />
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <SkeletonBlock opacity={opacity} style={[styles.bar, styles.kicker]} />
        <SkeletonBlock opacity={opacity} style={[styles.bar, styles.title]} />
        <SkeletonBlock opacity={opacity} style={[styles.bar, styles.w76]} />
        <SkeletonBlock opacity={opacity} style={[styles.bar, styles.w58]} />
        <SkeletonBlock opacity={opacity} style={[styles.bar, styles.w44]} />
      </View>
    </View>
  );
}

// Số đo theo `FlowProcessDiagram` (DOT 30, ROW_H 112) và `FlowProcessDetail`.
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    diagramCard: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      height: 112 + 16,
    },
    cell: {
      flex: 1,
      paddingHorizontal: 4,
    },
    dotRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 4,
    },
    dot: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    connector: {
      flex: 1,
      height: 2,
      marginLeft: 8,
      marginRight: -4,
      backgroundColor: c.borderStrong,
    },
    bar: {
      height: 12,
      borderRadius: 6,
      marginTop: 8,
    },
    name: {
      width: "72%",
      height: 13,
    },
    sub: {
      width: "48%",
      height: 11,
      marginTop: 6,
    },
    panel: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    kicker: {
      width: 72,
      height: 10,
      marginTop: 0,
    },
    title: {
      width: "56%",
      height: 16,
      marginBottom: 4,
    },
    w76: {
      width: "76%",
    },
    w58: {
      width: "58%",
    },
    w44: {
      width: "44%",
    },
    historyRow: {
      flexDirection: "row",
    },
    rail: {
      width: 24,
      alignItems: "center",
    },
    railDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 5,
    },
    railLine: {
      flex: 1,
      width: 2,
      backgroundColor: c.borderStrong,
    },
    historyBody: {
      flex: 1,
      paddingLeft: 6,
      paddingBottom: 16,
    },
    historyTitle: {
      width: "62%",
      height: 14,
      marginTop: 4,
    },
    historyTime: {
      width: 96,
      height: 10,
    },
  });
