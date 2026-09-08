import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { useSkeletonAutoFill } from "./useSkeletonAutoFill";

/**
 * Chiều cao một thẻ, gồm cả khoảng cách xuống thẻ dưới — xem `makeStyles`.
 *
 * Xuất ra ngoài cho chỗ phải tự tính số thẻ vì khung không đo được (panel trượt
 * của `AssetList`), để hai bên không lệch số đo.
 */
export const MENU_CARD_ROW_HEIGHT = 58 + 6;
const ROW_HEIGHT = MENU_CARD_ROW_HEIGHT;

/**
 * Khung xám nhấp nháy đúng hình dáng thẻ menu, dùng trong lúc tải.
 *
 * Thay cho vòng xoay giữa màn trắng: người dùng thấy ngay bố cục sắp hiện ra nên
 * cảm giác nhanh hơn, dù thời gian tải không đổi. Dùng cho mọi màn danh sách thẻ
 * (cây tài sản, cây camera).
 *
 * Số thẻ tự tính theo chiều cao thật của khung nên khung xám phủ kín màn: một số
 * dòng cố định sẽ chừa một vùng trống bên dưới trên máy màn lớn, nhìn như danh
 * sách đã tải xong mà thiếu dữ liệu. Thẻ cuối bị cắt ngang là có ý — giống danh
 * sách thật còn nội dung phía dưới.
 *
 * CHỈ vẽ khi màn chưa có gì để vẽ — dùng `shouldShowListSkeleton` để quyết định,
 * đừng chỉ hỏi "đang gọi API không": tải lại lúc danh sách đã có dữ liệu phải
 * diễn ra âm thầm.
 */
export default function MenuCardSkeleton({
  rows,
  hasSearchBar = false,
  hasGroupHeader = false,
}: {
  rows?: number;
  /**
   * Thanh tìm kiếm cố định trên đầu ba màn cây menu (`MenuTreeSearchBar`).
   *
   * Chỉ dựng ô nhập, KHÔNG dựng hàng badge "N kết quả" / "Thu tất cả" bên dưới:
   * hàng đó chỉ hiện khi đã gõ từ khoá hoặc đã mở nhóm, mà lúc khung chờ chạy
   * thì cả hai đều chưa xảy ra — vẽ thêm là dựng một khối màn thật không có.
   */
  hasSearchBar?: boolean;
  /**
   * Tiêu đề nhóm phía trên các thẻ — danh sách báo cáo gom thẻ theo nhóm. Chỉ
   * dựng MỘT tiêu đề: số nhóm chỉ biết sau khi có dữ liệu.
   */
  hasGroupHeader?: boolean;
}) {
  const styles = useStyles(makeStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(ROW_HEIGHT, rows);

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      accessibilityLabel="Đang tải danh sách"
    >
      {hasSearchBar ? (
        <Animated.View
          style={[styles.searchBar, { borderColor: hairlineBorderColor, opacity }]}
        >
          <View style={styles.searchIcon} />
          <View style={styles.searchText} />
        </Animated.View>
      ) : null}

      {hasGroupHeader ? (
        <Animated.View style={[styles.groupHeader, { opacity }]}>
          <View style={styles.groupIcon} />
          <View style={styles.groupTitle} />
          <View style={styles.groupCount} />
        </Animated.View>
      ) : null}

      {Array.from({ length: rowCount }).map((_, index) => (
        <Animated.View
          key={index}
          // Đếm được thẻ mà không phụ thuộc vị trí trong cây: các khối header ở
          // trên là tuỳ chọn, đếm theo con trực tiếp của khung là sai ngay khi
          // thêm một khối mới.
          testID="menu-card-skeleton-card"
          style={[styles.card, { borderColor: hairlineBorderColor, opacity }]}
        >
          <View style={styles.icon} />
          <View style={styles.lines}>
            {/* Dòng nhãn dài ngắn khác nhau cho giống danh sách thật. */}
            <View style={[styles.line, index % 3 === 0 && styles.lineShort]} />
          </View>
          <View style={styles.chevron} />
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra thành cuộn được.
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    // Ô tìm kiếm thật là hộp TRẮNG có viền (`SearchBar` cardBox), chỉ chữ bên
    // trong mới xám — vẽ thành khối xám đặc là lệch hình dáng.
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      // Cộng với `paddingTop` của khung là đúng 14 của `MenuTreeSearchBar`.
      marginTop: 10,
      marginBottom: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    searchIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    searchText: {
      width: "56%",
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 9,
    },
    groupIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: c.skeleton,
    },
    groupTitle: {
      flex: 1,
      height: 13,
      maxWidth: "46%",
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    groupCount: {
      width: 66,
      height: 20,
      marginLeft: "auto",
      borderRadius: 999,
      backgroundColor: c.skeleton,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 58,
      marginBottom: 6,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    lines: {
      flex: 1,
    },
    line: {
      height: 12,
      width: "62%",
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    lineShort: {
      width: "42%",
    },
    chevron: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
  });
