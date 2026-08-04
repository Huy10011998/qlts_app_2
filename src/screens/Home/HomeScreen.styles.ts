import { StyleSheet } from "react-native";
import { AppColors } from "../../utils/helpers/colors";
import { HOME_REPORT_CARD_MIN_HEIGHT } from "./shared/HomeReportCard";

// Layout constants shared between the screen grid math and these styles.
export const HOME_CONTENT_HORIZONTAL_PADDING = 16;
export const HOME_FEATURE_GRID_GAP = 10;
// 106 = accentBar(3+8) + iconWrap(44+6) + labelWrap(34) + paddingBottom(8), cộng
// chút dư. Trước đây là 132 vì mỗi card còn một chip mũi tên ở đáy; bỏ chip đó
// nên lưới ngắn lại ~26pt mỗi hàng, đủ để TỔNG QUAN nằm trên mà không đẩy hàng
// chức năng đầu tiên ra khỏi màn hình.
export const HOME_FEATURE_CARD_HEIGHT = 106;

export const HOME_SHORTCUT_VISIBLE_CARDS = 4;
// Khi ghim quá 4, card thu nhỏ để card thứ 5 hở ra một phần. Cuộn ngang mà không
// thấy gì bên phải thì user không biết là còn nữa — chính điểm yếu của cuộn ngang.
// Vừa đúng 4 thì giữ nguyên bề rộng cũ để hàng lấp kín, không chừa khoảng trống.
const HOME_SHORTCUT_PEEK_CARDS = 4.35;

export const getHomeShortcutCardWidth = (
  contentWidth: number,
  itemCount: number,
) => {
  const visibleCards =
    itemCount > HOME_SHORTCUT_VISIBLE_CARDS
      ? HOME_SHORTCUT_PEEK_CARDS
      : HOME_SHORTCUT_VISIBLE_CARDS;

  return (
    (contentWidth - HOME_FEATURE_GRID_GAP * (visibleCards - 1)) / visibleCards
  );
};

export const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
      paddingTop: 16,
      paddingBottom: 32,
    },

    grid: {
      flexDirection: "column",
      gap: HOME_FEATURE_GRID_GAP,
      marginBottom: 14,
    },
    gridRow: {
      flexDirection: "row",
      gap: HOME_FEATURE_GRID_GAP,
    },
    homeGridItem: {
      height: HOME_FEATURE_CARD_HEIGHT,
    },

    // Hàng shortcut tràn ra sát hai mép màn hình: card cuộn khuất dưới mép thật
    // thay vì bị cắt ở lề 16pt của nội dung, nên phần hở ra trông có chủ đích.
    shortcutRow: {
      marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
      marginBottom: 14,
    },
    shortcutRowContent: {
      paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
      gap: HOME_FEATURE_GRID_GAP,
    },
    shortcutCard: {
      height: HOME_FEATURE_CARD_HEIGHT,
    },
    noPermissionCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingVertical: 20,
      paddingHorizontal: 12,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },

    // Card báo cáo tự lo phần style bên trong HomeReportCard; đây chỉ là ô lưới.
    reportGridItem: {
      minHeight: HOME_REPORT_CARD_MIN_HEIGHT,
    },
    overviewErrorCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    overviewErrorText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "600",
      color: c.textSecondary,
    },
    overviewErrorAction: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
