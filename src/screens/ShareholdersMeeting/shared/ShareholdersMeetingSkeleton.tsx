import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../../../components/ui/useSkeletonAutoFill";

/** Thẻ cổ đông: `paddingVertical 12` + avatar 40 + `marginBottom 6`. */
const ROW_HEIGHT = 64 + 6;

/**
 * Khung chờ của màn Đại hội cổ đông.
 *
 * Dùng cho cả hai cổng chặn ở đầu màn — chờ đọc quyền (`!loaded`) và chờ phiên
 * họp (`isMeetingLoading`) — vì cả hai đều dẫn tới cùng một bố cục: hai thẻ số
 * liệu, ô tìm kiếm, rồi danh sách cổ đông.
 *
 * `variant="voting"` cho tab Lấy ý kiến: cũng hai thẻ số liệu nhưng bên dưới là
 * một khối chọn ý kiến chứ không phải danh sách.
 *
 * Ô tìm kiếm và thẻ cổ đông là **hộp trắng có viền**, giống `SearchBar` và
 * `ShareholderAttendanceRow` thật, chỉ phần chữ mới tô xám. Vẽ thành khối xám
 * đặc thì vừa lệch hình dáng, vừa dễ tàng hình: nền trang (#F0F2F8) và nền phụ
 * (#F0F2F6) gần như cùng một màu — xem token `skeleton`.
 */
export default function ShareholdersMeetingSkeleton({
  variant = "attendance",
}: {
  variant?: "attendance" | "voting";
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(ROW_HEIGHT);

  return (
    <View
      style={styles.root}
      onLayout={onLayout}
      accessibilityLabel="Đang tải dữ liệu đại hội cổ đông"
    >
      <View style={styles.summaryRow}>
        {[0, 1].map((index) => (
          <Animated.View
            key={`summary-${index}`}
            style={[styles.summaryCard, { borderColor: colors.border, opacity }]}
          >
            <View style={styles.summaryNum} />
            <View style={styles.summaryLabel} />
          </Animated.View>
        ))}
      </View>

      {variant === "voting" ? (
        <Animated.View
          style={[styles.voteCard, { borderColor: colors.border, opacity }]}
        >
          <View style={styles.voteSectionLabel} />
          <View style={styles.voteSelector} />
          <View style={styles.voteSectionLabel} />
          <View style={styles.voteChoice} />
          <View style={styles.voteChoice} />
        </Animated.View>
      ) : (
        <>
          <Animated.View
            style={[styles.searchBar, { borderColor: colors.border, opacity }]}
          >
            <View style={styles.searchIcon} />
            <View style={styles.searchText} />
          </Animated.View>

          <View style={styles.list}>
            {Array.from({ length: rowCount }).map((_, index) => (
              <Animated.View
                key={`row-${index}`}
                style={[styles.row, { borderColor: colors.border, opacity }]}
              >
                <View style={styles.avatar} />
                <View style={styles.rowLines}>
                  <View style={styles.rowName} />
                  <View style={styles.rowMeta} />
                </View>
                <View style={styles.rowAction} />
              </Animated.View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      // Hàng dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      paddingTop: 12,
      backgroundColor: c.bg,
    },
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    summaryCard: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
    },
    summaryNum: {
      width: 34,
      height: 20,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryLabel: {
      width: 82,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      marginHorizontal: 16,
      marginBottom: 12,
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
    list: {
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 6,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.skeleton,
    },
    rowLines: { flex: 1, gap: 6 },
    rowName: {
      width: "58%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    rowMeta: {
      width: "36%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    rowAction: {
      width: 74,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    voteCard: {
      marginHorizontal: 16,
      padding: 12,
      gap: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    voteSectionLabel: {
      width: 108,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    voteSelector: {
      height: 48,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    voteChoice: {
      height: 44,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
  });
