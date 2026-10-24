import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { AppColors, C, useStyles } from "../../../utils/helpers/colors";
import { ROW_DIVIDER_OPACITY } from "../../../utils/helpers/tokens";
import SettingSectionGroup, {
  SettingSectionAccentContext,
} from "./SettingSectionGroup";

/**
 * Thẻ 5 nhóm (xem `settingGroups.ts`) viền đỏ và thẻ Đăng xuất viền hồng bên
 * dưới — đúng `accent` mà `SettingScreen` truyền cho hai `SettingSectionGroup`.
 */
const SECTIONS = [
  { rows: 5, accent: C.red },
  { rows: 1, accent: C.rose },
];

/**
 * Khung chờ của màn Cài đặt.
 *
 * Bố cục màn này **hoàn toàn cố định** — không có gì phụ thuộc dữ liệu BE ngoài
 * tên và ảnh đại diện — nên khung chờ dựng đúng được từng dòng. Vùng đỏ dùng
 * cùng dải gradient và cùng đường bo hai góc dưới với màn thật: nó chiếm nửa
 * trên màn hình, lệch một chút là thấy giật khi dữ liệu về.
 *
 * Trước đây chỗ này là vòng xoay giữa màn trắng, mất cả vùng đỏ — vào Cài đặt
 * thấy trắng rồi mới đỏ, giật hẳn một nhịp màu.
 *
 * Thẻ nhóm dùng lại chính `SettingSectionGroup` (viền 1pt + mép trên 3pt theo
 * `accent`), không vẽ lại: hai chỗ tự vẽ khung thẻ thì đổi màu một bên là lệch
 * bên kia.
 */
export default function SettingScreenSkeleton({
  safeTop = 44,
}: {
  safeTop?: number;
}) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.root} accessibilityLabel="Đang tải cài đặt">
      <LinearGradient
        colors={[C.redLight, C.red, C.redDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.redZone}
      >
        <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
          {/* Hai vòng trang trí mờ của `SettingProfileHeader`. */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar} />
          </View>
          <View style={styles.name} />
          <View style={styles.badge} />
        </View>
      </LinearGradient>

      <View style={styles.greyZone}>
        {SECTIONS.map((section, sectionIndex) => (
          <SettingSectionGroup
            key={`section-${sectionIndex}`}
            accent={section.accent}
            // Nhóm đầu: `groupListTop` của màn thật; nhóm sau giữ marginTop 22
            // mặc định của `SettingSectionGroup`.
            style={sectionIndex === 0 ? styles.firstSection : undefined}
          >
            {Array.from({ length: section.rows }).map((_, rowIndex) => (
              <SkeletonRow
                key={`row-${rowIndex}`}
                isLast={rowIndex === section.rows - 1}
              />
            ))}
          </SettingSectionGroup>
        ))}
      </View>
    </View>
  );
}

/**
 * Một dòng của `SettingRowItem`: ô icon 38, hai dòng chữ, ô mũi tên 24. Vạch
 * ngăn lấy màu `accent` của nhóm đang bọc, nhạt như vạch thật.
 */
function SkeletonRow({ isLast }: { isLast: boolean }) {
  const styles = useStyles(makeStyles);
  const accent = useContext(SettingSectionAccentContext);

  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowIcon} />
        <View style={styles.rowLines}>
          <View style={styles.rowLabel} />
          <View style={styles.rowSub} />
        </View>
        <View style={styles.rowChevron} />
      </View>
      {isLast ? null : (
        <View
          style={[
            styles.separator,
            accent ? { backgroundColor: accent } : null,
          ]}
        />
      )}
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    header: {
      alignItems: "center",
      paddingBottom: 20,
      overflow: "hidden",
    },
    deco1: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: "rgba(255,255,255,0.07)",
      top: -60,
      left: -40,
    },
    deco2: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: "rgba(255,255,255,0.06)",
      top: 20,
      right: -20,
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
    // Tên 19pt đậm (dòng ~23) + marginBottom 8 của `SettingProfileHeader`.
    name: {
      width: 168,
      height: 19,
      marginTop: 2,
      marginBottom: 10,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    // Nhãn chức danh: đệm dọc 5 × 2 + viền 1 × 2 + chữ 11pt (~13).
    badge: {
      width: 96,
      height: 25,
      borderRadius: 13,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    // Như `redZone` của SettingScreen: không padding, vì iOS không tô gradient
    // phần padding còn Android có.
    redZone: {
      overflow: "hidden",
    },
    greyZone: {
      flexGrow: 1,
    },
    // Cùng khoảng cách với danh sách nhóm của màn thật (`groupListTop`).
    firstSection: {
      marginTop: 24,
    },
    // Đệm và ô icon theo `SettingRowItem`: dòng cao 13 + 38 + 13 = 64.
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 13,
      paddingHorizontal: 16,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      marginRight: 14,
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
    // Ô mũi tên thật nền `border`, không phải chữ — vẽ đúng màu đó.
    rowChevron: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: c.border,
    },
    // `separator` của `SettingRowItem` trong nhóm có `accent`.
    separator: {
      height: 1,
      marginHorizontal: 16,
      opacity: ROW_DIVIDER_OPACITY,
      backgroundColor: c.separator,
    },
  });
