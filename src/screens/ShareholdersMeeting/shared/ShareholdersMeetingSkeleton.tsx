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
 * Thẻ tên đại hội và thanh hai tab dựng luôn ở đây, vì hai cổng chặn kia nằm
 * TRƯỚC chúng trong màn thật — không dựng thì vào màn thấy trống nửa trên rồi
 * hai khối cao gần 120pt nhảy vào, đẩy cả danh sách xuống. Luôn vẽ hai tab: số
 * tab thật tuỳ quyền, mà lúc `!loaded` thì chưa đọc xong quyền — hai tab là
 * trường hợp thường gặp, và tab đầu vẽ theo dáng đang chọn giống màn thật.
 *
 * Ô tìm kiếm và thẻ cổ đông là **hộp trắng có viền**, giống `SearchBar` và
 * `ShareholderAttendanceRow` thật, chỉ phần chữ mới tô xám. Vẽ thành khối xám
 * đặc thì vừa lệch hình dáng, vừa dễ tàng hình: nền trang (#F0F2F8) và nền phụ
 * (#F0F2F6) gần như cùng một màu — xem token `skeleton`.
 */
export default function ShareholdersMeetingSkeleton({
  variant = "attendance",
  withHeader = true,
}: {
  variant?: "attendance" | "voting";
  /**
   * Dựng thẻ tên đại hội + thanh tab. Tắt ở chỗ khung chờ nằm BÊN TRONG màn
   * (tab Lấy ý kiến đang tải): hai khối đó là đồ thật đang hiện ngay phía trên,
   * vẽ lại là ra hai bộ chồng nhau.
   */
  withHeader?: boolean;
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
      {withHeader ? (
        <>
          <Animated.View style={[styles.heroCard, { opacity }]}>
            <View style={styles.heroTitle} />
          </Animated.View>

          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {[0, 1].map((index) => (
              <Animated.View
                key={`tab-${index}`}
                style={[
                  styles.tab,
                  index === 0 && {
                    borderColor: colors.accent,
                    backgroundColor: colors.accentLight,
                  },
                  { opacity },
                ]}
              >
                <View style={styles.tabLabel} />
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}

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
      backgroundColor: c.bg,
    },
    heroCard: {
      backgroundColor: c.accent,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 12,
      borderRadius: 18,
      padding: 16,
    },
    // Thẻ đã là khối màu đặc, vạch tên bên trong phải sáng hơn nền chứ không
    // dùng token `skeleton` (xám nhạt, chìm nghỉm trên nền accent).
    heroTitle: {
      alignSelf: "center",
      width: "62%",
      height: 12,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.45)",
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      borderBottomWidth: 1,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.surfaceAlt,
    },
    tabLabel: {
      width: 72,
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      /* Khoảng hở trên của vùng nội dung (`content` trong màn thật) đặt ở đây
         chứ không ở `root`: có header hay không thì hai thẻ số liệu vẫn cách
         thứ nằm trên đúng 12. */
      paddingTop: 12,
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
