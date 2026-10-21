import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { scaledLineHeight } from "../../../utils/helpers/textScaling";
import { useSkeletonAutoFill } from "../../../components/ui/useSkeletonAutoFill";

/**
 * Một dòng cổ đông, đo theo `ShareholderAttendanceRow`: cột phải là nhãn trạng
 * thái (đệm 3 × 2 + chữ 11pt + viền ≈ 21) chồng trên nút Điểm danh (đệm 5 × 2 +
 * chữ 11pt ≈ 23), cách 6 → 50, cao hơn avatar 40 nên quyết định chiều cao dòng:
 * 12 + 50 + 12 + viền 2 = 76. Cộng `marginBottom 6` của dòng và vạch ngăn
 * `AttendanceSeparator` (1 + marginVertical 2 × 2).
 */
const ROW_HEIGHT = 76 + 6 + 5;

/** Ba ô lọc của tab Điểm danh: Tất cả · Đã điểm danh · Chưa điểm danh. */
const ATTENDANCE_SUMMARY_LABEL_WIDTHS = [36, 66, 74];
/** Hai ô của tab Lấy ý kiến: Ý kiến · Đã chọn. */
const VOTING_SUMMARY_LABEL_WIDTHS = [40, 48];
/** Tab Lấy ý kiến luôn có ba lựa chọn: Đồng ý · Không đồng ý · Không ý kiến. */
const VOTING_CHOICE_COUNT = 3;

/**
 * Khung chờ của màn Đại hội cổ đông.
 *
 * Dùng cho cả hai cổng chặn ở đầu màn — chờ đọc quyền (`!loaded`) và chờ phiên
 * họp (`isMeetingLoading`) — vì cả hai đều dẫn tới cùng một bố cục: dòng tỷ lệ
 * tham dự, ba ô lọc, ô tìm kiếm, rồi danh sách cổ đông.
 *
 * `variant="voting"` cho tab Lấy ý kiến: hai ô số liệu, bên dưới là thẻ chọn ý
 * kiến và thẻ phân loại ý kiến chứ không phải danh sách.
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
 *
 * Số đo lấy từ `makeAttStyles` / `makeVoteStyles` của `ShareholdersMeetingScreen`.
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
  // Ô số liệu, thẻ cổ đông và thẻ ý kiến thật đều viền `hairline` (giao diện
  // tối thì không viền).
  const hairlineBorderColor = useHairlineBorderColor();
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
            <View style={styles.heroTitleSlot}>
              <View style={styles.heroTitle} />
            </View>
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

      {/* Khoảng hở trên của vùng nội dung (`content` trong màn thật) đặt ở đây
          chứ không ở `root`: có header hay không thì khối đầu vẫn cách thứ nằm
          trên đúng 12. */}
      <View style={styles.content}>
        {variant === "voting" ? (
          <>
            <View style={[styles.summaryRow, styles.voteSummaryRow]}>
              {VOTING_SUMMARY_LABEL_WIDTHS.map((labelWidth, index) => (
                <Animated.View
                  key={`summary-${index}`}
                  style={[
                    styles.summaryCard,
                    styles.voteSummaryCard,
                    { borderColor: hairlineBorderColor, opacity },
                  ]}
                >
                  <View style={[styles.summaryNum, styles.voteSummaryNum]} />
                  <View
                    style={[
                      styles.summaryLabel,
                      styles.voteSummaryLabel,
                      { width: labelWidth },
                    ]}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Thẻ "Ý kiến cần lấy": nhãn + khung chọn (dòng hướng dẫn, nút
                mở danh sách cao tối thiểu 64). */}
            <Animated.View
              style={[
                styles.voteCard,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View style={styles.voteSectionLabel} />
              <View
                style={[
                  styles.opinionSelector,
                  { borderColor: hairlineBorderColor },
                ]}
              >
                <View style={styles.opinionHeader}>
                  <View style={styles.opinionHint} />
                  <View style={styles.opinionCount} />
                </View>
                <View
                  style={[
                    styles.opinionButton,
                    { borderColor: hairlineBorderColor },
                  ]}
                >
                  <View style={styles.opinionIcon} />
                  <View style={styles.opinionTextWrap}>
                    <View style={styles.opinionLabel} />
                    <View style={styles.opinionValue} />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Thẻ "Phân loại ý kiến": ba ô lựa chọn. */}
            <Animated.View
              style={[
                styles.voteCard,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View style={styles.voteSectionLabel} />
              <View style={styles.choiceList}>
                {Array.from({ length: VOTING_CHOICE_COUNT }).map((_, index) => (
                  <View
                    key={`choice-${index}`}
                    style={[
                      styles.choiceCard,
                      { borderColor: hairlineBorderColor },
                    ]}
                  >
                    <View style={styles.choiceBox} />
                    <View style={styles.choiceTextWrap}>
                      <View style={styles.choiceTitle} />
                      <View style={styles.choiceDesc} />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          </>
        ) : (
          <>
            {/* "Tỷ lệ tham dự hiện tại: x%". */}
            <Animated.View style={[styles.helperLine, { opacity }]} />

            <View style={styles.summaryRow}>
              {ATTENDANCE_SUMMARY_LABEL_WIDTHS.map((labelWidth, index) => (
                <Animated.View
                  key={`summary-${index}`}
                  style={[
                    styles.summaryCard,
                    { borderColor: hairlineBorderColor, opacity },
                  ]}
                >
                  <View style={styles.summaryNum} />
                  <View style={[styles.summaryLabel, { width: labelWidth }]} />
                </Animated.View>
              ))}
            </View>

            <Animated.View
              style={[styles.searchBar, { borderColor: colors.border, opacity }]}
            >
              <View style={styles.searchIcon} />
              <View style={styles.searchText} />
            </Animated.View>

            <View style={styles.list}>
              {Array.from({ length: rowCount }).map((_, index) => (
                <React.Fragment key={`row-${index}`}>
                  {index > 0 ? (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  ) : null}
                  <Animated.View
                    style={[
                      styles.row,
                      { borderColor: hairlineBorderColor, opacity },
                    ]}
                  >
                    <View style={styles.avatar} />
                    <View style={styles.rowLines}>
                      <View style={styles.rowName} />
                      <View style={styles.rowMeta} />
                    </View>
                    <View style={styles.rowRight}>
                      <View style={styles.rowBadge} />
                      <View style={styles.rowAction} />
                    </View>
                  </Animated.View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}
      </View>
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
    // Tên đại hội thật cỡ 12 nhưng `lineHeight` gấp đôi — dòng cao 24 chứ không
    // phải 12, theo cả cỡ chữ app.
    heroTitleSlot: {
      height: scaledLineHeight(12, 2),
      justifyContent: "center",
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
    content: {
      paddingTop: 12,
    },
    // `helperText`: chữ 12pt (dòng ~14) + marginBottom 12.
    helperLine: {
      width: "46%",
      height: 10,
      marginHorizontal: 16,
      marginTop: 2,
      marginBottom: 14,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    // Ô tab Điểm danh: đệm 10, số 20pt (dòng ~24), nhãn 10pt cách 2 (~12).
    summaryCard: {
      flex: 1,
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
    },
    summaryNum: {
      width: 34,
      height: 20,
      marginVertical: 2,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryLabel: {
      height: 10,
      marginTop: 3,
      marginBottom: 1,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // Ô tab Lấy ý kiến to hơn: đệm 12, bo 12, số 22pt (~26), nhãn 11pt cách 4
    // (~13), và cách thẻ bên dưới 16 chứ không phải 12.
    voteSummaryRow: {
      marginBottom: 16,
    },
    voteSummaryCard: {
      borderRadius: 12,
      padding: 12,
    },
    voteSummaryNum: {
      height: 22,
    },
    voteSummaryLabel: {
      height: 11,
      marginTop: 5,
      marginBottom: 1,
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
    separator: {
      height: 1,
      marginVertical: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
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
      marginRight: 12,
      backgroundColor: c.skeleton,
    },
    // Tên 14pt (~17) + mã/số cổ phần 12pt cách 2 (~14).
    rowLines: { flex: 1, paddingTop: 2 },
    rowName: {
      width: "58%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    rowMeta: {
      width: "36%",
      height: 11,
      marginTop: 7,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 8 },
    rowBadge: {
      width: 64,
      height: 21,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    rowAction: {
      width: 72,
      height: 23,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    // `makeVoteStyles.card`.
    voteCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    // Nhãn thẻ 14pt đậm (~17) + marginBottom 10.
    voteSectionLabel: {
      width: 108,
      height: 13,
      marginTop: 2,
      marginBottom: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    opinionSelector: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: c.surfaceAlt,
    },
    opinionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    opinionHint: {
      flex: 1,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    opinionCount: {
      width: 56,
      height: 24,
      borderRadius: 999,
      backgroundColor: c.skeleton,
    },
    opinionButton: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 64,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    opinionIcon: {
      width: 20,
      height: 20,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    opinionTextWrap: { flex: 1, marginLeft: 10 },
    opinionLabel: {
      width: 72,
      height: 10,
      marginBottom: 6,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    opinionValue: {
      width: "74%",
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    choiceList: { gap: 10 },
    // `choiceCard`: đệm 14, tiêu đề 13pt (~16) + mô tả 12pt cách 2 (~14).
    choiceCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    choiceBox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    choiceTextWrap: { flex: 1, marginLeft: 10 },
    choiceTitle: {
      width: "40%",
      height: 12,
      marginVertical: 2,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    choiceDesc: {
      width: "70%",
      height: 10,
      marginTop: 4,
      marginBottom: 2,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
  });
