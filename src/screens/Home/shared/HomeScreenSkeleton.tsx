import React from "react";
import { StyleSheet, View } from "react-native";

import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import {
  HOME_CONTENT_HORIZONTAL_PADDING,
  HOME_FEATURE_CARD_HEIGHT,
  HOME_FEATURE_GRID_GAP,
} from "../HomeScreen.styles";
import { HOME_SHORTCUT_COLUMNS } from "./homeShortcutPages";
import HomeStatTiles from "./HomeStatTiles";

/** Số khối lớn dựng sẵn: cơ cấu thiết bị, tiêu thụ, điểm danh. */
const CARD_COUNT = 2;

/**
 * Khung chờ của Trang chủ, dùng khi CHƯA đọc xong quyền và menu.
 *
 * Trước đây chỗ này là một vòng xoay nhỏ giữa màn trắng, dù mọi khối bên trong
 * (lưới số liệu, cơ cấu thiết bị, tiêu thụ) đều đã có khung chờ riêng — nên cổng
 * vào lại là thứ duy nhất không có. Dựng đúng bố cục sẽ hiện ra thì lúc dữ liệu
 * về, các khối thật thay vào chỗ khung xám chứ không nhảy từ giữa màn ra.
 *
 * Lưới số liệu dùng lại `HomeStatTiles` ở chế độ đang tải, không vẽ lại: hai chỗ
 * vẽ riêng thì sửa kích thước ô một bên là lệch bên kia.
 *
 * Tĩnh, không nhấp nháy — giống các khung chờ khác của Trang chủ. Khung chờ dạng
 * thẻ menu (`MenuCardSkeleton`) có nhấp nháy vì nó chiếm cả màn hàng chục dòng,
 * còn ở đây phần lớn màn là khối thật của các card.
 */
export default function HomeScreenSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View
        style={[styles.sectionTitle, { backgroundColor: colors.skeleton }]}
      />
      <HomeStatTiles tiles={[]} isLoading />

      <View
        style={[
          styles.sectionTitle,
          styles.sectionTitleShort,
          { backgroundColor: colors.skeleton },
        ]}
      />
      <View style={styles.shortcutRow}>
        {Array.from({ length: HOME_SHORTCUT_COLUMNS }).map((_, index) => (
          <View
            key={`shortcut-${index}`}
            style={[
              styles.shortcutCard,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
            ]}
          />
        ))}
      </View>

      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <View
          key={`card-${index}`}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        />
      ))}
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Khối cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
      paddingTop: 16,
    },
    sectionTitle: {
      width: 168,
      height: 11,
      marginBottom: 12,
      borderRadius: 5,
    },
    sectionTitleShort: {
      width: 124,
      marginTop: 18,
    },
    shortcutRow: {
      flexDirection: "row",
      gap: HOME_FEATURE_GRID_GAP,
    },
    shortcutCard: {
      flex: 1,
      height: HOME_FEATURE_CARD_HEIGHT,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
    },
    card: {
      height: 148,
      marginTop: 14,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
    },
  });
