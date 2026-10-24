import { StyleSheet } from "react-native";
import { scaledLineHeight } from "../../utils/helpers/textScaling";

import { AppColors, C } from "../../utils/helpers/colors";
import { ROW_DIVIDER_OPACITY, elevation } from "../../utils/helpers/tokens";

/**
 * Hình thức của hai màn hướng dẫn.
 *
 * Mượn lại đúng ngôn ngữ hình đã có trong app: thẻ trắng bo 20 viền mảnh như thẻ
 * nhóm ở màn Chức năng, ô icon 38×38 bo 11 như hàng trong tab Cài đặt. Người dùng
 * không phải học một kiểu bố cục riêng chỉ để đọc hướng dẫn.
 */
export const GUIDE_SCREEN_PADDING = 16;

/** Tô viền + mép trên của `card` theo một màu khác màu mặc định. */
export const guideCardAccent = (color: string | undefined) =>
  color ? { borderColor: color, borderTopColor: color } : null;

/** Gạch dưới tiêu đề thẻ (`cardHeader`) theo cùng màu đã truyền `guideCardAccent`. */
export const guideCardHeaderAccent = (color: string | undefined) =>
  color ? { borderBottomColor: color } : null;

export const makeGuideStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    // Ô tìm kiếm đứng yên, danh sách cuộn phía dưới — giống màn Chức năng, nên
    // cần vạch mảnh để hàng cuộn lên không dính vào ô.
    searchWrap: {
      paddingHorizontal: GUIDE_SCREEN_PADDING,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },

    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: GUIDE_SCREEN_PADDING,
      paddingTop: 14,
      paddingBottom: 36,
      gap: 14,
    },

    intro: {
      fontSize: 12.5,
      color: c.textSub,
      paddingHorizontal: 2,
    },

    // Viền 1pt + mép trên 3pt như card Trang chủ / Cài đặt. Màu mặc định là màu
    // của Hướng dẫn sử dụng ở Cài đặt; màn một chủ đề tô lại theo màu chủ đề đó
    // (`guideCardAccent`).
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderTopWidth: 3,
      borderColor: C.emerald,
      ...elevation(c.shadow, 2),
    },
    // Gạch dưới tiêu đề cùng màu và dày bằng viền thẻ, như thẻ nhóm ở màn Chức
    // năng. Thẻ tô màu khác thì tô lại bằng `guideCardHeaderAccent`.
    cardHeader: {
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 11,
      borderBottomWidth: 1,
      borderBottomColor: C.emerald,
    },
    cardHeaderTitle: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.1,
      color: c.textSub,
      textTransform: "uppercase",
    },

    // ─── Hàng chủ đề ─────────────────────────────────────────────────────────
    // Vạch ngăn các dòng là `sectionDivider` đặt giữa hai dòng: thụt vào bằng lề
    // ngang, viền dưới của dòng thì kéo sát hai mép thẻ.
    topicRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    topicIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      ...elevation(c.shadow, 1),
    },
    topicTextCol: { flex: 1 },
    topicTitle: {
      fontSize: 14.5,
      fontWeight: "600",
      color: c.text,
    },
    topicSummary: {
      fontSize: 11.5,
      marginTop: 2,
      color: c.textSub,
    },
    topicMatch: {
      fontSize: 11,
      marginTop: 4,
      color: c.accent,
    },
    chevronWrap: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 7,
      backgroundColor: c.border,
    },

    // ─── Màn chi tiết ────────────────────────────────────────────────────────
    topicHero: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    topicHeroText: { flex: 1 },
    topicHeroTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    topicHeroSummary: {
      fontSize: 12,
      marginTop: 3,
      color: c.textSub,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 12,
    },
    sectionHeading: {
      flex: 1,
      fontSize: 14.5,
      fontWeight: "700",
      color: c.text,
    },
    // Gạch giữa tiêu đề và nội dung, và giữa các dòng của thẻ nhóm: cùng tông
    // màu viền thẻ nhưng nhạt (màu mặc định của `card`, mục có `accent` thì tô
    // lại theo đó).
    sectionDivider: {
      height: 1,
      backgroundColor: C.emerald,
      opacity: ROW_DIVIDER_OPACITY,
      marginHorizontal: 14,
    },
    sectionBody: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 12,
    },

    // ─── Khối nội dung ───────────────────────────────────────────────────────
    paragraph: {
      fontSize: 13.5,
      lineHeight: scaledLineHeight(13.5, 1.55),
      color: c.textSecondary,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    stepNumber: {
      width: 21,
      height: 21,
      borderRadius: 11,
      backgroundColor: C.red,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      // Nhích xuống cho tâm số thẳng dòng chữ đầu tiên.
      marginTop: 1,
    },
    stepNumberText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.onBrand,
      includeFontPadding: false,
    },
    bulletDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.textSub,
      marginRight: 12,
      marginLeft: 8,
      marginTop: 8,
    },
    listText: {
      flex: 1,
      fontSize: 13.5,
      lineHeight: scaledLineHeight(13.5, 1.55),
      color: c.textSecondary,
    },
    listGap: { gap: 9 },

    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    noteInfo: {
      backgroundColor: c.blueSurface,
      borderColor: c.slateBorder,
    },
    noteWarn: {
      backgroundColor: c.amberLight,
      borderColor: c.amberBorder,
    },
    noteIcon: { marginRight: 9, marginTop: 1 },
    noteText: {
      flex: 1,
      fontSize: 12.5,
      color: c.textSecondary,
    },

    image: {
      width: "100%",
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      backgroundColor: c.surfaceAlt,
    },
    imageCaption: {
      fontSize: 11.5,
      marginTop: 6,
      color: c.textSub,
      textAlign: "center",
    },

    // ─── Liên hệ hỗ trợ ──────────────────────────────────────────────────────
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    contactIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    contactTextCol: { flex: 1 },
    contactLabel: {
      fontSize: 11.5,
      color: c.textSub,
    },
    contactValue: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },

    footerNote: {
      fontSize: 11.5,
      color: c.textMuted,
      textAlign: "center",
      paddingHorizontal: 8,
    },

    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderTopWidth: 3,
      borderColor: C.emerald,
      ...elevation(c.shadow, 2),
    },
  });
