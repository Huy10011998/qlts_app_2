import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";

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
 * Khung chờ của màn Cài đặt (phần dưới ảnh đầu màn).
 *
 * Bố cục màn này **hoàn toàn cố định** — không có gì phụ thuộc dữ liệu BE ngoài
 * thẻ hồ sơ — nên khung chờ dựng đúng được từng dòng. Ảnh đầu màn
 * (`SettingPhotoHeader`) hiện sẵn cả lúc chờ; ở đây chỉ vẽ thẻ hồ sơ đỏ cùng cỡ
 * thẻ thật (`SettingProfileCard`, cao 194), lệch là thấy giật khi dữ liệu về.
 *
 * Thẻ nhóm dùng lại chính `SettingSectionGroup` (viền 1pt + mép trên 3pt theo
 * `accent`), không vẽ lại: hai chỗ tự vẽ khung thẻ thì đổi màu một bên là lệch
 * bên kia.
 */
export default function SettingScreenSkeleton() {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.root} accessibilityLabel="Đang tải cài đặt">
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar} />
          <View style={styles.cardLines}>
            <View style={styles.name} />
            <View style={styles.title} />
          </View>
        </View>
        <View style={styles.infoBlock}>
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <View style={styles.infoBar} />
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoBar, styles.infoBarLong]} />
            </View>
          </View>
          <View style={styles.qr} />
        </View>
        <View style={styles.strip} />
      </View>

      <View style={styles.greyZone}>
        {SECTIONS.map((section, sectionIndex) => (
          <SettingSectionGroup
            key={`section-${sectionIndex}`}
            accent={section.accent}
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
      flexGrow: 1,
    },
    // Khung `SettingProfileCard`: hàng đầu 80 + 2 hàng 30 + 6 + dải 48 = 194.
    // Thẻ đỏ ở cả hai chế độ; chỗ chữ là vệt trắng mờ trên nền đỏ.
    card: {
      height: 194,
      marginHorizontal: 16,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: C.red,
    },
    cardTop: {
      height: 80,
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 8,
      paddingHorizontal: 16,
      gap: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    cardLines: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      gap: 8,
    },
    name: {
      width: "72%",
      height: 15,
      borderRadius: 7,
      backgroundColor: "rgba(255,255,255,0.3)",
    },
    title: {
      width: "52%",
      height: 12,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    // Nút QR thật nền tối mờ trên thẻ đỏ — vẽ đúng màu đó.
    qr: {
      width: 72,
      height: 40,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.18)",
    },
    // Nút QR bên phải hai dòng Mã NV / Bộ phận, như thẻ thật.
    infoBlock: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 16,
      gap: 10,
    },
    infoRows: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    },
    infoRow: {
      height: 30,
      justifyContent: "center",
      paddingLeft: 16,
    },
    infoBar: {
      width: "42%",
      height: 12,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    infoBarLong: {
      width: "64%",
    },
    strip: {
      height: 48,
      marginTop: 6,
      backgroundColor: "rgba(0,0,0,0.14)",
    },
    greyZone: {
      flexGrow: 1,
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
