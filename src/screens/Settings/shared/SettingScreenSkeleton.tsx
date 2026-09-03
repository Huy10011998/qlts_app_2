import React from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { AppColors, C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import SettingWaveDivider from "./SettingWaveDivider";

/** Hai nhóm cài đặt đầu tiên nằm trong tầm nhìn — TÀI KHOẢN 3 dòng, KHÁC 5 dòng. */
const SECTIONS = [3, 5];

/**
 * Khung chờ của màn Cài đặt.
 *
 * Bố cục màn này **hoàn toàn cố định** — không có gì phụ thuộc dữ liệu BE ngoài
 * tên và ảnh đại diện — nên khung chờ dựng đúng được từng dòng. Vùng đỏ và dải
 * sóng dùng lại chính component của màn thật (`SettingWaveDivider`, cùng dải
 * gradient) chứ không vẽ lại: chúng chiếm nửa trên màn hình, vẽ lại là lệch.
 *
 * Trước đây chỗ này là vòng xoay giữa màn trắng, mất cả vùng đỏ — vào Cài đặt
 * thấy trắng rồi mới đỏ, giật hẳn một nhịp màu.
 */
export default function SettingScreenSkeleton({
  safeTop = 44,
}: {
  safeTop?: number;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg }]}
      accessibilityLabel="Đang tải cài đặt"
    >
      <LinearGradient
        colors={[C.redLight, C.red, C.redDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar} />
          </View>
          <View style={styles.name} />
          <View style={styles.badge} />
        </View>
        <SettingWaveDivider />
      </LinearGradient>

      <View style={styles.greyZone}>
        {SECTIONS.map((rowCount, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            <View
              style={[styles.sectionTitle, { backgroundColor: colors.skeleton }]}
            />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
              ]}
            >
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={[
                    styles.row,
                    rowIndex < rowCount - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.rowIcon} />
                  <View style={styles.rowLines}>
                    <View style={styles.rowLabel} />
                    <View style={styles.rowSub} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      overflow: "hidden",
    },
    header: {
      alignItems: "center",
      paddingBottom: 20,
    },
    avatarRing: {
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.55)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    name: {
      width: 168,
      height: 19,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    badge: {
      width: 96,
      height: 20,
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    greyZone: {
      flexGrow: 1,
    },
    section: {
      marginTop: 16,
      marginHorizontal: 16,
    },
    sectionTitle: {
      width: 92,
      height: 11,
      marginBottom: 10,
      borderRadius: 5,
      alignSelf: "center",
    },
    card: {
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.skeleton,
    },
    rowLines: {
      flex: 1,
      gap: 6,
    },
    rowLabel: {
      width: "46%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    rowSub: {
      width: "68%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
  });
