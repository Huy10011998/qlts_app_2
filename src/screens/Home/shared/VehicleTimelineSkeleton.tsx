import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SkeletonBlock from "../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../components/ui/useSkeletonAutoFill";
import {
  AppColors,
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";

/** Nhóm ngày đầu mở sẵn vài dòng, các nhóm sau gập — như danh sách thật vừa tải. */
const OPEN_ROWS = 3;
const COLLAPSED_GROUPS = 2;

/**
 * Khung chờ phần danh sách của màn Dừng đỗ (`stops`) và Hành trình (`journey`):
 * cả hai cùng gom theo ngày — tiêu đề nhóm nền xám có lịch, số đếm, mũi tên — và
 * mỗi dòng là một mốc trên đường dọc. Icon tĩnh hiện thật, chữ là khối xám.
 *
 * Nằm TRONG khung viền danh sách của màn, thay chỗ của nội dung.
 */
export default function VehicleTimelineSkeleton({ variant }: { variant: "stops" | "journey" }) {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const opacity = useSkeletonPulse();

  return (
    <View accessibilityLabel={variant === "stops" ? "Đang tải điểm dừng" : "Đang tải hành trình"}>
      <View style={[styles.group, { borderBottomColor: separatorColor }]}>
        <GroupHeader opacity={opacity} open />
        {Array.from({ length: OPEN_ROWS }).map((_, index) => (
          <View key={index} style={styles.row}>
            <View style={styles.lineCol}>
              <SkeletonBlock opacity={opacity} style={styles.dot} />
              {index < OPEN_ROWS - 1 ? <View style={styles.line} /> : null}
            </View>
            {variant === "stops" ? (
              <View style={styles.body}>
                <SkeletonBlock opacity={opacity} style={styles.time} />
                <SkeletonBlock
                  opacity={opacity}
                  style={[styles.address, index % 2 === 1 && styles.addressShort]}
                />
                <SkeletonBlock opacity={opacity} style={styles.pill} />
              </View>
            ) : (
              <View style={styles.body}>
                <SkeletonBlock opacity={opacity} style={[styles.time, styles.timeWide]} />
                <SkeletonBlock
                  opacity={opacity}
                  style={[styles.address, index % 2 === 1 && styles.addressShort]}
                />
                <SkeletonBlock opacity={opacity} style={styles.endAddress} />
                <View style={styles.pills}>
                  <SkeletonBlock opacity={opacity} style={styles.pill} />
                  <SkeletonBlock opacity={opacity} style={styles.pill} />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {Array.from({ length: COLLAPSED_GROUPS }).map((_, index) => (
        <View key={index} style={[styles.group, { borderBottomColor: separatorColor }]}>
          <GroupHeader opacity={opacity} open={false} />
        </View>
      ))}
    </View>
  );
}

function GroupHeader({
  opacity,
  open,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
  open: boolean;
}) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.groupHeader}>
      <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
      <View style={styles.groupDateWrap}>
        <SkeletonBlock opacity={opacity} style={styles.groupDate} />
      </View>
      <SkeletonBlock opacity={opacity} style={styles.count} />
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.textSecondary} />
    </View>
  );
}

// Số đo của `VehicleTrackingScreen` / `VehicleJourneyScreen` (group, stopRow, tripRow…).
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    group: {
      borderBottomWidth: 1,
    },
    groupHeader: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      backgroundColor: c.surfaceAlt,
      gap: 8,
    },
    groupDateWrap: {
      flex: 1,
    },
    groupDate: {
      width: "52%",
      height: 13,
      borderRadius: 6,
    },
    count: {
      width: 64,
      height: 22,
      borderRadius: 12,
    },
    row: {
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingTop: 14,
    },
    lineCol: {
      width: 25,
      alignItems: "center",
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    line: {
      width: 2,
      flex: 1,
      minHeight: 66,
      backgroundColor: c.border,
    },
    body: {
      flex: 1,
      paddingLeft: 5,
      paddingBottom: 16,
    },
    time: {
      width: 72,
      height: 11,
      marginTop: 2,
      borderRadius: 5,
    },
    timeWide: {
      width: 118,
    },
    address: {
      width: "84%",
      height: 14,
      marginTop: 9,
      borderRadius: 6,
    },
    addressShort: {
      width: "62%",
    },
    endAddress: {
      width: "56%",
      height: 11,
      marginTop: 8,
      borderRadius: 5,
    },
    pills: {
      flexDirection: "row",
      gap: 8,
    },
    pill: {
      width: 72,
      height: 22,
      marginTop: 9,
      borderRadius: 12,
    },
  });
