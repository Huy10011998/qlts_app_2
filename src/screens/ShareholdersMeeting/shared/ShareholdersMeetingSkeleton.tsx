import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../../../components/ui/useSkeletonAutoFill";

/**
 * Một dòng cổ đông, đo theo `ShareholderAttendanceRow`: nút 42 cao hơn cột chữ
 * (tên 15pt ~18 + mã 13pt cách 2 ~16) và avatar 40 nên quyết định chiều cao:
 * 12 + 42 + 12 + viền 2 = 68, cộng `marginBottom 8`.
 */
const ROW_HEIGHT = 68 + 8;

/** Ba viên lọc của tab Điểm danh: Tất cả · Đã có mặt · Chưa (kèm số). */
const ATTENDANCE_FILTER_WIDTHS = [86, 96, 76];
/** Tab Lấy ý kiến luôn có ba ô phân loại: Tán thành · Không tán thành · Không có ý kiến. */
const VOTING_CHOICE_COUNT = 3;
/** Thanh ba bước: Nội dung · Phân loại · Quét QR. */
const VOTING_STEP_LABEL_WIDTHS = [52, 58, 50];

/**
 * Khung chờ của màn Đại hội cổ đông.
 *
 * Dùng cho cả hai cổng chặn ở đầu màn — chờ đọc quyền (`!loaded`) và chờ phiên
 * họp (`isMeetingLoading`) — vì cả hai đều dẫn tới cùng một bố cục: thẻ tổng
 * quan cổ phần dự họp, ba viên lọc, rồi danh sách cổ đông.
 *
 * `variant="voting"` cho tab Lấy ý kiến: thanh ba bước, thẻ nội dung biểu
 * quyết, thẻ ba ô phân loại chứ không phải danh sách; nút quét nằm ở thanh
 * dính đáy.
 *
 * Thanh hai tab dựng luôn ở đây, vì hai cổng chặn kia nằm TRƯỚC nó trong màn
 * thật — không dựng thì vào màn thấy trống phần trên rồi thanh tab nhảy vào,
 * đẩy cả danh sách xuống. Tên đại hội nằm ở dòng phụ của header. Luôn vẽ hai
 * tab: số tab thật tuỳ quyền, mà lúc `!loaded` thì chưa đọc xong quyền — hai tab
 * là trường hợp thường gặp, và tab đầu có gạch đỏ như đang chọn.
 *
 * Thẻ cổ đông là **hộp trắng có viền**, giống `ShareholderAttendanceRow` thật,
 * chỉ phần chữ mới tô xám. Ô tìm kiếm không vẽ: nó ẩn sau nút kính lúp trên
 * header, chỉ hiện khi bấm. Vẽ thành khối xám đặc thì vừa lệch hình dáng, vừa dễ
 * tàng hình: nền trang (#F0F2F8) và nền phụ (#F0F2F6) gần như cùng một màu — xem
 * token `skeleton`.
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
  // Thẻ cổ đông và thẻ ý kiến thật đều viền `hairline` (giao diện
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
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {[0, 1].map((index) => (
              <View
                key={`tab-${index}`}
                style={[styles.tab, index === 0 && styles.tabActive]}
              >
                <Animated.View style={[styles.tabLabel, { opacity }]} />
                <Animated.View style={[styles.tabPill, { opacity }]} />
              </View>
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
            <View style={styles.steps}>
              {VOTING_STEP_LABEL_WIDTHS.map((width, index) => (
                <React.Fragment key={`step-${index}`}>
                  {index > 0 ? <View style={styles.stepLine} /> : null}
                  <Animated.View style={[styles.step, { opacity }]}>
                    <View style={styles.stepDot} />
                    <View style={[styles.stepLabel, { width }]} />
                  </Animated.View>
                </React.Fragment>
              ))}
            </View>

            {/* Thẻ "Nội dung biểu quyết": nhãn + nút Đổi, mã, tên hai dòng,
                dòng chân thẻ. */}
            <Animated.View
              style={[
                styles.voteCard,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View style={styles.voteCardHeader}>
                <View style={styles.voteSectionLabel} />
                <View style={styles.voteHeaderLink} />
              </View>
              <View style={styles.opinionCode} />
              <View style={styles.opinionTitle} />
              <View style={[styles.opinionTitle, styles.opinionTitleShort]} />
              <View
                style={[
                  styles.opinionFoot,
                  { borderTopColor: colors.separator },
                ]}
              >
                <View style={styles.opinionFootText} />
                <View style={styles.opinionFootText} />
              </View>
            </Animated.View>

            {/* Thẻ "Phân loại ý kiến": ba ô vòng icon + nhãn. */}
            <Animated.View
              style={[
                styles.voteCard,
                { borderColor: hairlineBorderColor, opacity },
              ]}
            >
              <View
                style={[styles.voteSectionLabel, styles.voteSectionLabelSpaced]}
              />
              <View style={styles.tiles}>
                {Array.from({ length: VOTING_CHOICE_COUNT }).map((_, index) => (
                  <View
                    key={`choice-${index}`}
                    style={[styles.tile, { borderColor: colors.separator }]}
                  >
                    <View style={styles.tileIcon} />
                    <View style={styles.tileLabel} />
                  </View>
                ))}
              </View>
            </Animated.View>
          </>
        ) : (
          <>
            <HeroSkeleton opacity={opacity} styles={styles} />

            <View style={styles.filterRow}>
              {ATTENDANCE_FILTER_WIDTHS.map((width, index) => (
                <Animated.View
                  key={`filter-${index}`}
                  style={[
                    styles.filterChip,
                    { width, borderColor: colors.slateBorder, opacity },
                  ]}
                />
              ))}
            </View>

            <View style={styles.list}>
              {Array.from({ length: rowCount }).map((_, index) => (
                <Animated.View
                  key={`row-${index}`}
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
                  <View style={styles.rowAction} />
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Thanh nút quét dính đáy của tab Lấy ý kiến: dòng chú thích + nút. */}
      {variant === "voting" ? (
        <SafeAreaView
          edges={{ bottom: "maximum" }}
          style={[styles.scanBar, { borderTopColor: colors.separator }]}
        >
          <Animated.View style={[styles.scanCaption, { opacity }]} />
          <Animated.View style={[styles.scanButton, { opacity }]} />
        </SafeAreaView>
      ) : null}
    </View>
  );
}

/**
 * Thẻ tổng quan (`MeetingHeroCard`): vòng 88 bên trái, nhãn + số cổ phần +
 * tổng + viên điều kiện bên phải; đáy thẻ hai cột người có mặt / chưa đến.
 */
function HeroSkeleton({
  opacity,
  styles,
}: {
  opacity: Animated.Value | Animated.AnimatedInterpolation<number>;
  styles: ReturnType<typeof makeStyles>;
}) {
  const separatorColor = useSeparatorColor();

  return (
    <View style={[styles.hero, { borderColor: separatorColor }]}>
      <View style={styles.heroTop}>
        <Animated.View style={[styles.heroRing, { opacity }]} />
        <View style={styles.heroLines}>
          <Animated.View style={[styles.heroLabel, { opacity }]} />
          <Animated.View style={[styles.heroValue, { opacity }]} />
          <Animated.View style={[styles.heroCaption, { opacity }]} />
          <Animated.View style={[styles.heroChip, { opacity }]} />
        </View>
      </View>
      <View style={[styles.heroBottom, { borderTopColor: separatorColor }]}>
        {[0, 1].map((index) => (
          <View
            key={`stat-${index}`}
            style={[
              styles.heroStat,
              index > 0 && {
                borderLeftWidth: 1,
                borderLeftColor: separatorColor,
              },
            ]}
          >
            <Animated.View style={[styles.heroStatLabel, { opacity }]} />
            <Animated.View style={[styles.heroStatValue, { opacity }]} />
            <Animated.View style={[styles.heroStatBar, { opacity }]} />
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
      // Hàng dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    // Tab gạch chân: đệm 13 / 11 + chữ 14pt (~17) + gạch 2.5.
    tabBar: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderBottomWidth: 1,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 43.5,
      borderBottomWidth: 2.5,
      borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: c.red },
    tabLabel: {
      width: 66,
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    tabPill: {
      width: 34,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    content: {
      paddingTop: 14,
    },
    hero: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
    },
    heroRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 10,
      borderColor: c.skeleton,
    },
    heroLines: { flex: 1, gap: 8 },
    heroLabel: {
      width: 104,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    heroValue: {
      width: 132,
      height: 24,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    heroCaption: {
      width: 120,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    heroChip: {
      width: 150,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.skeleton,
    },
    heroBottom: { flexDirection: "row", borderTopWidth: 1 },
    heroStat: {
      flex: 1,
      gap: 7,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
    },
    heroStatLabel: {
      width: 92,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    heroStatValue: {
      width: 70,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    heroStatBar: {
      height: 5,
      borderRadius: 3,
      backgroundColor: c.skeleton,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    // Viên lọc: đệm 7 + chữ 12.5pt (~15) + viền → cao ~31.
    filterChip: {
      height: 31,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    list: {
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 14,
      paddingRight: 12,
      marginBottom: 8,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.skeleton,
    },
    rowLines: { flex: 1, gap: 8 },
    rowName: {
      width: "58%",
      height: 14,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    rowMeta: {
      width: "40%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    rowAction: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: c.skeleton,
    },
    // `makeVoteStyles.steps`: chấm 22 trong khung 28, vạch nối giãn đều.
    steps: {
      flexDirection: "row",
      alignItems: "center",
      height: 28,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    step: { flexDirection: "row", alignItems: "center", gap: 7 },
    stepDot: {
      width: 22,
      height: 22,
      marginLeft: 3,
      borderRadius: 11,
      backgroundColor: c.skeleton,
    },
    stepLabel: { height: 10, borderRadius: 5, backgroundColor: c.skeleton },
    stepLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 6,
      borderRadius: 1,
      backgroundColor: c.skeleton,
    },
    // `makeVoteStyles.card`.
    voteCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    voteCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    // Nhãn thẻ 15pt đậm (~18).
    voteSectionLabel: {
      width: 132,
      height: 14,
      marginVertical: 2,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    voteSectionLabelSpaced: { marginBottom: 14 },
    voteHeaderLink: {
      width: 44,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    opinionCode: {
      width: 52,
      height: 20,
      marginBottom: 8,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    opinionTitle: {
      width: "88%",
      height: 15,
      marginBottom: 8,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    opinionTitleShort: { width: "52%" },
    opinionFoot: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    opinionFootText: {
      width: 84,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    tiles: { flexDirection: "row", gap: 8 },
    // `makeVoteStyles.tile`: vòng icon 46 + nhãn tối đa hai dòng.
    tile: {
      flex: 1,
      alignItems: "center",
      gap: 10,
      paddingTop: 14,
      paddingBottom: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    tileIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.skeleton,
    },
    tileLabel: {
      width: "60%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // `makeVoteStyles.scanBar`, đẩy xuống đáy bằng marginTop auto.
    scanBar: {
      marginTop: "auto",
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderTopWidth: 1,
      backgroundColor: c.surface,
    },
    scanCaption: {
      alignSelf: "center",
      width: 180,
      height: 10,
      marginTop: 3,
      marginBottom: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    scanButton: {
      height: 54,
      borderRadius: 16,
      backgroundColor: c.skeleton,
    },
  });
