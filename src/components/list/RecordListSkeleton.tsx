import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../ui/useSkeletonAutoFill";
import RecordCardSkeleton, {
  getRecordCardHeight,
  type RecordCardTrailing,
  type RecordCardVariant,
} from "./RecordCardSkeleton";

/**
 * Khung chờ đầy đủ của một màn danh sách bản ghi: phần header cố định + số thẻ
 * vừa đủ phủ kín màn.
 *
 * Trước đây 8 màn danh sách đều `IsLoading` giữa màn trắng, và cái đó **xoá mất
 * cả header** — ô tìm kiếm, thẻ tổng số, banner — dù chúng có kích thước cố định
 * biết trước trong `listStyles.ts`. Nên dựng lại đúng chỗ của chúng: lúc dữ liệu
 * về, header thật thay vào đúng vị trí, danh sách không nhảy xuống.
 *
 * Mỗi màn khai phần header mình có thay vì tự vẽ, để 8 màn chờ giống nhau.
 *
 * CHỈ vẽ khi màn chưa có gì để vẽ — dùng `shouldShowListSkeleton` để quyết định.
 */
export default function RecordListSkeleton({
  hasSearchBar = false,
  hasSummaryCard = false,
  hasBanner = false,
  hasGroupHeader = false,
  variant = "avatar",
  lines = 3,
  trailing = "none",
  rows,
}: {
  hasSearchBar?: boolean;
  hasSummaryCard?: boolean;
  /** Dải nhắc vuốt của `AssetList`, chỉ hiện khi class có cây con. */
  hasBanner?: boolean;
  /**
   * Tiêu đề nhóm phía trên các thẻ — tab Tệp gom thẻ theo loại tệp. Chỉ dựng MỘT
   * tiêu đề: số nhóm chỉ biết sau khi có dữ liệu, nên đây là phần xấp xỉ duy
   * nhất của khung chờ này.
   */
  hasGroupHeader?: boolean;
  variant?: RecordCardVariant;
  lines?: number;
  trailing?: RecordCardTrailing;
  /**
   * Số thẻ cố định, cho chỗ KHÔNG đo được chiều cao khung: bên trong `ScrollView`
   * hoặc bottom sheet, chiều cao khung lại do chính nội dung quyết định nên phép
   * tự đếm sẽ chạy vòng. Bỏ trống thì tự phủ kín màn.
   */
  rows?: number;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(
    getRecordCardHeight(variant, lines),
    rows,
  );

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      accessibilityLabel="Đang tải danh sách"
    >
      {hasSearchBar ? (
        <View style={styles.searchWrap}>
          {/* Ô tìm kiếm thật là hộp TRẮNG có viền (`SearchBar` cardBox), chỉ chữ
              bên trong mới xám — vẽ thành khối xám đặc là lệch hình dáng. */}
          <Animated.View
            style={[styles.searchBar, { borderColor: colors.border, opacity }]}
          >
            <View style={styles.searchIcon} />
            <View style={styles.searchText} />
          </Animated.View>
          <View style={styles.summaryRow}>
            <Animated.View
              style={[
                styles.summaryBadge,
                { backgroundColor: colors.skeleton, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.summaryMeta,
                { backgroundColor: colors.skeleton, opacity },
              ]}
            />
          </View>
        </View>
      ) : null}

      {hasSummaryCard ? (
        <Animated.View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity },
          ]}
        >
          <View style={styles.summaryCardIcon} />
          <View style={styles.summaryCardLines}>
            <View style={styles.summaryCardTitle} />
            <View style={styles.summaryCardSub} />
          </View>
        </Animated.View>
      ) : null}

      {hasBanner ? (
        <Animated.View
          style={[
            styles.banner,
            { backgroundColor: colors.skeleton, opacity },
          ]}
        />
      ) : null}

      {hasGroupHeader ? (
        <Animated.View
          style={[
            styles.groupHeader,
            { backgroundColor: colors.skeleton, opacity },
          ]}
        />
      ) : null}

      {Array.from({ length: rowCount }).map((_, index) => (
        <RecordCardSkeleton
          key={index}
          variant={variant}
          lines={lines}
          trailing={trailing}
          opacity={opacity}
        />
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    searchWrap: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
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
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 12,
    },
    summaryBadge: {
      width: 108,
      height: 22,
      borderRadius: 8,
    },
    summaryMeta: {
      width: 76,
      height: 12,
      borderRadius: 6,
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 14,
      marginBottom: 6,
      padding: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    summaryCardIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      marginRight: 10,
      backgroundColor: c.skeleton,
    },
    summaryCardLines: {
      flex: 1,
      gap: 6,
    },
    summaryCardTitle: {
      width: "56%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryCardSub: {
      width: "34%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    groupHeader: {
      width: 128,
      height: 14,
      marginTop: 12,
      marginBottom: 8,
      marginHorizontal: 24,
      borderRadius: 6,
    },
    banner: {
      height: 38,
      marginHorizontal: 14,
      marginBottom: 6,
      borderRadius: 12,
    },
  });
