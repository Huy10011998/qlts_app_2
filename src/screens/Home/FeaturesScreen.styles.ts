import { StyleSheet } from "react-native";

import { AppColors } from "../../utils/helpers/colors";
import { HOME_BRAND_RED } from "./shared/homeTheme";

/**
 * Màn Chức năng dùng bố cục "danh mục dịch vụ": một khối hero màu thương hiệu
 * kèm ô tìm kiếm, bên dưới là các thẻ trắng, mỗi thẻ một nhóm chức năng với lưới
 * 3 cột icon tròn.
 *
 * Tách khỏi HomeScreen.styles vì Trang chủ vẫn giữ lưới 4 cột dạng card có viền;
 * hai màn không còn dùng chung hình dạng ô nữa.
 */
export const FEATURE_SCREEN_PADDING = 16;
export const FEATURE_GRID_COLUMNS = 3;
export const FEATURE_CARD_PADDING = 10;

// Ô rộng theo PHẦN TRĂM thẻ chứ không tính ra pixel từ bề ngang cửa sổ: chỉ cần
// lệch một chút giữa padding giả định và padding thật là tổng bề rộng vượt hàng
// và lưới rớt xuống 2 cột. Phần trăm thì luôn đúng 3 ô mỗi hàng.
export const FEATURE_TILE_WIDTH = `${100 / FEATURE_GRID_COLUMNS}%` as const;

export const makeFeatureStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    centerState: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: FEATURE_SCREEN_PADDING,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: FEATURE_SCREEN_PADDING,
      paddingTop: 12,
      paddingBottom: 40,
      gap: 14,
    },

    // Ô tìm kiếm nằm ngay dưới header đỏ, trên nền xám của trang: thẻ trắng có
    // viền mảnh để tách khỏi nền mà không cần bóng đổ nặng.
    // Ô tìm kiếm đứng yên còn lưới cuộn phía dưới, nên phải chừa khoảng dưới ô
    // và kẻ một vạch mảnh: không có nó thì hàng icon cuộn lên bị cắt ngang sát
    // mép ô, nhìn như dính vào nhau.
    searchWrap: {
      paddingHorizontal: FEATURE_SCREEN_PADDING,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },

    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: FEATURE_CARD_PADDING,
      paddingTop: 14,
      paddingBottom: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    // Gạch chân kéo hết bề ngang thẻ (bù lại padding ngang) để tiêu đề nhóm tách
    // hẳn khỏi lưới, thay vì trôi lơ lửng giữa khoảng trắng.
    sectionHeader: {
      marginHorizontal: -FEATURE_CARD_PADDING,
      paddingHorizontal: FEATURE_CARD_PADDING,
      paddingBottom: 12,
      marginBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
      letterSpacing: 0.2,
    },
    sectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },

    tile: {
      width: FEATURE_TILE_WIDTH,
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    tileIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    tileBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: HOME_BRAND_RED,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: c.surface,
    },
    tileBadgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "700",
    },
    // Chiều cao cố định cho nhãn: tên một dòng và tên hai dòng nằm cùng thẻ thì
    // hàng dưới phải bắt đầu ngang nhau, không so le.
    tileLabel: {
      fontSize: 12.5,
      height: 32,
      fontWeight: "500",
      color: c.text,
      textAlign: "center",
    },

    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  });
