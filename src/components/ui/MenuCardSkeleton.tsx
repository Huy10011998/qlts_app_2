import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { useSkeletonAutoFill } from "./useSkeletonAutoFill";

/**
 * Dáng thẻ của khung chờ, theo đúng màn đang chờ:
 * - `menu`: thẻ cây menu (`AssetMenuDropdownItem`, `CameraMenuDropdownItem`,
 *   `AssetTreeNodeItem`) — cao 58, một dòng nhãn, ô chevron 24.
 * - `related`: danh mục liên kết ở tab Chi tiết (`AssetDetailsTab`) — cao 56
 *   (icon 34 + paddingVertical 11), cuối dòng chỉ là chevron 14 trơn.
 * - `report`: thẻ báo cáo (`ReportListCard` ở `ReportScreen`) — hai dòng chữ,
 *   icon 40, ô chevron 28, vạch màu 4 bên trái.
 */
export type MenuCardSkeletonVariant = "menu" | "related" | "report";

/**
 * Thẻ báo cáo không có minHeight, cao theo icon 40 (cao hơn khối hai dòng chữ:
 * tiêu đề 14.5 + 5 + đường dẫn 12 ≈ 37) + paddingVertical 13 + viền hairline —
 * khung chờ dựng đúng chừng ấy nên cũng ra đúng số này.
 */
const REPORT_CARD_HEIGHT = 40 + 13 * 2 + StyleSheet.hairlineWidth * 2;

/** Chiều cao một thẻ, gồm cả khoảng cách xuống thẻ dưới — xem `makeStyles`. */
const ROW_HEIGHTS: Record<MenuCardSkeletonVariant, number> = {
  menu: 58 + 6,
  related: 56 + 8,
  report: REPORT_CARD_HEIGHT + 9,
};

/**
 * Chiều cao một thẻ `menu`, gồm cả khoảng cách xuống thẻ dưới.
 *
 * Xuất ra ngoài cho chỗ phải tự tính số thẻ vì khung không đo được (panel trượt
 * của `AssetList`), để hai bên không lệch số đo.
 */
export const MENU_CARD_ROW_HEIGHT = ROW_HEIGHTS.menu;

/**
 * Khung xám nhấp nháy đúng hình dáng thẻ menu, dùng trong lúc tải.
 *
 * Thay cho vòng xoay giữa màn trắng: người dùng thấy ngay bố cục sắp hiện ra nên
 * cảm giác nhanh hơn, dù thời gian tải không đổi. Dùng cho mọi màn danh sách thẻ
 * (cây tài sản, cây camera, danh sách báo cáo, danh mục liên kết).
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
  variant = "menu",
  hasSearchBar = false,
  hasCollapseAll = false,
  hasRecents = false,
  hasGroupHeader = false,
  paddingTop = 4,
  paddingHorizontal = 14,
}: {
  rows?: number;
  variant?: MenuCardSkeletonVariant;
  /**
   * Thanh tìm kiếm cố định trên đầu ba màn cây menu (`MenuTreeSearchBar`).
   *
   * Chỉ dựng ô nhập; ô "N kết quả" không bao giờ có lúc khung chờ chạy, vì gõ từ
   * khoá thì danh sách cũ được giữ lại chứ không thay bằng khung chờ.
   */
  hasSearchBar?: boolean;
  /**
   * Nút "Thu tất cả" dưới ô tìm kiếm. Nhóm đang mở được lưu xuống máy
   * (`useMenuTreeState`), nên người đã mở nhóm từ lần trước thì vào màn là có
   * nút này ngay — nơi gọi truyền `expandedIds.length > 0`, đúng điều kiện màn
   * thật. Không dựng thì lúc dữ liệu về cả danh sách tụt xuống một hàng.
   */
  hasCollapseAll?: boolean;
  /**
   * Hàng "Truy cập nhanh" (`MenuTreeRecents`) dưới ô tìm kiếm — cũng lưu xuống
   * máy, nơi gọi truyền `recents.length > 0`.
   */
  hasRecents?: boolean;
  /**
   * Tiêu đề nhóm phía trên các thẻ — danh sách báo cáo gom thẻ theo nhóm. Chỉ
   * dựng MỘT tiêu đề: số nhóm chỉ biết sau khi có dữ liệu.
   */
  hasGroupHeader?: boolean;
  /**
   * Lề trên của danh sách thật (`paddingTop` của `contentContainerStyle`), tính
   * từ dưới ô tìm kiếm / hàng Truy cập nhanh nếu có.
   */
  paddingTop?: number;
  /**
   * Lề ngang. 0 khi khung chứa đã tự có lề — panel trượt (`SlideInSidePanel`)
   * có padding 16, cộng thêm 14 ở đây là thẻ hẹp hơn thẻ thật 28.
   */
  paddingHorizontal?: number;
}) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(
    ROW_HEIGHTS[variant],
    rows,
  );

  return (
    <View
      style={[styles.wrap, { paddingHorizontal }]}
      onLayout={onLayout}
      accessibilityLabel="Đang tải danh sách"
    >
      {hasSearchBar ? (
        <View style={styles.searchWrap}>
          <Animated.View
            style={[
              styles.searchBar,
              { borderColor: hairlineBorderColor, opacity },
            ]}
          >
            <View style={styles.searchIcon} />
            <View style={styles.searchText} />
          </Animated.View>

          {hasCollapseAll ? (
            <View style={styles.metaRow}>
              <Animated.View style={[styles.collapseButton, { opacity }]}>
                <View style={styles.collapseText} />
              </Animated.View>
            </View>
          ) : null}
        </View>
      ) : null}

      {hasRecents ? (
        <Animated.View style={[styles.recents, { opacity }]}>
          <View style={styles.recentsHeading} />
          <View style={styles.recentsRow}>
            {/* Rộng hẹp khác nhau như nhãn thật; tràn mép phải thì bị cắt. */}
            {[118, 92, 136].map((width) => (
              <View
                key={width}
                style={[styles.recentChip, { borderColor: hairlineBorderColor }]}
              >
                <View style={styles.recentIcon} />
                {/* Trừ padding 12×2, icon 14 và gap 6 thì ra đúng bề rộng chip. */}
                <View style={[styles.recentText, { width: width - 44 }]} />
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      <View style={{ paddingTop }}>
        {hasGroupHeader ? (
          <Animated.View style={[styles.groupHeader, { opacity }]}>
            <View style={styles.groupIcon} />
            <View style={styles.groupTitle} />
            <View style={styles.groupCount} />
          </Animated.View>
        ) : null}

        {Array.from({ length: rowCount }).map((_, index) =>
          variant === "report" ? (
            <Animated.View
              key={index}
              testID="menu-card-skeleton-card"
              style={[
                styles.reportCard,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View style={styles.reportAccent} />
              <View style={styles.reportIcon} />
              <View style={styles.lines}>
                <View style={[styles.line, index % 3 === 0 && styles.lineShort]} />
                <View
                  style={[
                    styles.reportPath,
                    index % 2 === 1 && styles.reportPathLong,
                  ]}
                />
              </View>
              <View style={styles.reportChevron} />
            </Animated.View>
          ) : (
            <Animated.View
              key={index}
              // Đếm được thẻ mà không phụ thuộc vị trí trong cây: các khối header ở
              // trên là tuỳ chọn, đếm theo con trực tiếp của khung là sai ngay khi
              // thêm một khối mới.
              testID="menu-card-skeleton-card"
              style={[
                styles.card,
                variant === "related" && styles.cardRelated,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View style={styles.icon} />
              <View style={styles.lines}>
                {/* Dòng nhãn dài ngắn khác nhau cho giống danh sách thật. */}
                <View style={[styles.line, index % 3 === 0 && styles.lineShort]} />
              </View>
              {variant === "related" ? (
                // Dòng thật chỉ có mũi tên trơn 14pt, không có ô nền.
                <Ionicons name="chevron-forward" size={14} color={c.skeleton} />
              ) : (
                <View style={styles.chevron} />
              )}
            </Animated.View>
          ),
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra thành cuộn được.
      overflow: "hidden",
    },
    // Đúng `searchWrap` của `MenuTreeSearchBar` (lề ngang 14 đã có ở khung).
    searchWrap: {
      paddingTop: 14,
      paddingBottom: 8,
    },
    // Ô tìm kiếm thật là hộp TRẮNG có viền (`SearchBar` cardBox), chỉ chữ bên
    // trong mới xám — vẽ thành khối xám đặc là lệch hình dáng.
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
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
    // `metaRow` + `collapseButton` của `MenuTreeSearchBar`: nút nằm sát phải, cao
    // paddingVertical 3 + dòng chữ 11pt (~13) — cả hàng ~27.
    metaRow: {
      marginTop: 8,
      flexDirection: "row",
    },
    collapseButton: {
      marginLeft: "auto",
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    collapseText: {
      // Icon 13 + gap 4 + "Thu tất cả" 11pt.
      width: 68,
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    // `MenuTreeRecents`: tiêu đề 11pt (~13) + 6, chip 33, paddingBottom 10 — ~62.
    recents: {
      paddingBottom: 10,
    },
    recentsHeading: {
      width: 96,
      height: 9,
      marginVertical: 2,
      marginBottom: 8,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    recentsRow: {
      flexDirection: "row",
      gap: 8,
    },
    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      // Viền 1 + paddingVertical 8 + dòng chữ 12.5pt (~15) của chip thật.
      height: 33,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    recentIcon: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    recentText: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // `groupHeader` của `ReportScreen`: paddingTop 14, icon 26, paddingBottom 9.
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
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
    // `item` của `AssetDetailsTab`.
    cardRelated: {
      minHeight: 56,
      marginBottom: 8,
      paddingHorizontal: 14,
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
    // `reportCard` của `ReportScreen`: không đặt minHeight, để cao theo icon 40 +
    // paddingVertical 13 + viền như thẻ thật (`REPORT_CARD_HEIGHT`).
    reportCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 9,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
      backgroundColor: c.surface,
    },
    reportAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: c.skeleton,
    },
    reportIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.skeleton,
    },
    // Dòng đường dẫn nhóm (12pt, nhạt) dưới tiêu đề.
    reportPath: {
      height: 10,
      width: "48%",
      marginTop: 8,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    reportPathLong: {
      width: "70%",
    },
    reportChevron: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
  });
