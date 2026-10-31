import { StyleSheet } from "react-native";

import { AppColors } from "../../utils/helpers/colors";
import { getTextScaleFactor } from "../../utils/helpers/textScaling";
import type { FeatureTileGroup } from "./shared/FeatureTile";
import { HOME_BLOCK_TONES, type HomeBlockTone } from "./shared/homeBlockTone";
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

/**
 * Nhãn tiêu đề ba nhóm, kiểu nhãn màu ngoài thẻ của Trang chủ mẫu C
 * (`HomeSectionTitle`), mượn đúng bộ màu nhãn đỏ · xanh · tím của Trang chủ.
 * Dùng chung cho màn thật và khung chờ. `markerIconName` là bản đầy của icon
 * nhãn, vẽ trong chấm góc dưới mỗi ô (`GroupIconMarker`).
 */
export const FEATURE_SECTIONS: Record<
  FeatureTileGroup,
  {
    label: string;
    iconName: string;
    markerIconName: string;
    tone: HomeBlockTone;
  }
> = {
  feature: {
    label: "TIỆN ÍCH",
    iconName: "apps-outline",
    markerIconName: "apps",
    tone: HOME_BLOCK_TONES.shortcuts,
  },
  vehicle: {
    label: "PHƯƠNG TIỆN",
    iconName: "car-outline",
    markerIconName: "car",
    tone: HOME_BLOCK_TONES.utilities,
  },
  report: {
    label: "BÁO CÁO",
    iconName: "bar-chart-outline",
    markerIconName: "stats-chart",
    tone: HOME_BLOCK_TONES.assetStructure,
  },
};

export const makeFeatureStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    centerState: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: FEATURE_SCREEN_PADDING,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: FEATURE_SCREEN_PADDING,
      paddingTop: 14,
      paddingBottom: 40,
      gap: 18,
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

    // Tiêu đề nhóm nằm ngoài thẻ (`HomeSectionTitle`), thẻ chỉ còn lưới.
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: FEATURE_CARD_PADDING,
      paddingVertical: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    sectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },

    tile: {
      width: FEATURE_TILE_WIDTH,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    tileIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
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
    // Chỉ giữ chỗ MỘT dòng (theo cỡ chữ app): trước đây giữ sẵn hai dòng cho
    // mọi ô nên hàng nào cũng thừa một dòng trống, trong khi tên gần như đều
    // vừa một dòng. Tên dài xuống dòng thì cả hàng đó cao theo — các ô cùng
    // hàng của lưới flexWrap luôn cao bằng nhau nên hàng dưới vẫn thẳng.
    tileLabel: {
      fontSize: 12.5,
      minHeight: 16 * getTextScaleFactor(),
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
