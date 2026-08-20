import { StyleSheet } from "react-native";
import { AppColors } from "../../utils/helpers/colors";
import { HOME_REPORT_CARD_MIN_HEIGHT } from "./shared/HomeReportCard";
import { HOME_BRAND_RED } from "./shared/homeTheme";
import {
  HOME_SHORTCUT_COLUMNS,
  getHomeShortcutRowCount,
} from "./shared/homeShortcutPages";

// Layout constants shared between the screen grid math and these styles.
export const HOME_CONTENT_HORIZONTAL_PADDING = 16;
export const HOME_FEATURE_GRID_GAP = 10;
// 106 = accentBar(3+8) + iconWrap(44+6) + labelWrap(34) + paddingBottom(8), cộng
// chút dư. Trước đây là 132 vì mỗi card còn một chip mũi tên ở đáy; bỏ chip đó
// nên lưới ngắn lại ~26pt mỗi hàng, đủ để TỔNG QUAN nằm trên mà không đẩy hàng
// chức năng đầu tiên ra khỏi màn hình.
export const HOME_FEATURE_CARD_HEIGHT = 106;

// Truy cập nhanh giờ chia trang, không cuộn tự do nữa: mỗi trang rộng đúng bề
// ngang nội dung và lấp kín một hàng card, nên không còn phải chừa phần hở ra để
// báo "còn nữa" — hàng chấm tròn ở dưới đã nói điều đó.
export const getHomeShortcutCardWidth = (contentWidth: number) =>
  (contentWidth -
    HOME_FEATURE_GRID_GAP * (HOME_SHORTCUT_COLUMNS - 1)) /
  HOME_SHORTCUT_COLUMNS;

export const getHomeShortcutPagerHeight = (itemCount: number) => {
  const rows = getHomeShortcutRowCount(itemCount);

  if (rows <= 0) return 0;

  return (
    rows * HOME_FEATURE_CARD_HEIGHT + (rows - 1) * HOME_FEATURE_GRID_GAP
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

    // Trang shortcut rộng đúng bề ngang nội dung nên `pagingEnabled` snap đúng
    // từng trang — không cần snapToInterval và không tràn ra ngoài lề 16pt.
    shortcutPager: {
      alignSelf: "stretch",
    },
    shortcutPage: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignContent: "flex-start",
      gap: HOME_FEATURE_GRID_GAP,
    },
    shortcutCard: {
      height: HOME_FEATURE_CARD_HEIGHT,
    },
    // Chấm tròn bên trái, "Xem tất cả" bên phải, cùng một hàng dưới lưới.
    shortcutFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 28,
      marginTop: 6,
      marginBottom: 14,
    },
    shortcutDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 1,
    },
    shortcutDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.borderStrong,
    },
    shortcutDotActive: {
      width: 22,
      height: 7,
      borderRadius: 4,
      backgroundColor: HOME_BRAND_RED,
    },
    shortcutViewAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 0,
    },
    shortcutViewAllText: {
      fontSize: 11,
      fontWeight: "600",
      color: HOME_BRAND_RED,
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
      fontWeight: "600",
      color: c.textSecondary,
    },
    overviewErrorAction: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
