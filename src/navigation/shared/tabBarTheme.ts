import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../utils/helpers/colors";

/**
 * Thanh tab là một viên bo tròn NỔI đè lên nội dung như Facebook bản mới: chỉ
 * có icon, tab đang chọn có nền nhạt. Đây là chiều cao viên đó.
 */
export const TAB_HEIGHT = 60;

/** Viên thanh tab cách hai mép màn. */
export const TAB_BAR_SIDE_MARGIN = 14;

/** Ô chứa icon của mọi tab, kể cả ô đỏ của nút Quét. */
export const TAB_ICON_BOX_HEIGHT = 30;

/** Ô đỏ của nút Quét QR: nằm gọn trong viên, rộng hơn cao như nút "+" của TikTok. */
export const SCAN_TILE_WIDTH = 48;
export const SCAN_TILE_HEIGHT = 36;

/**
 * Viên thanh tab cách đáy màn bao nhiêu. iPhone có thanh vuốt (safe area đáy
 * ~34) thì viên ngồi lấn xuống vùng đó một chút như Facebook, không thì chừa tối
 * thiểu 12 cho viên khỏi dính mép.
 *
 * Android 15+ chạy tràn viền nên safe area đáy là cả thanh điều hướng — ba nút,
 * hay taskbar đầy icon app trên tablet Samsung. Lấn xuống là viên dính sát vào
 * mấy icon đó, nên Android đặt viên hẳn phía trên, chừa thêm một khoảng hở.
 */
export const getTabBarBottomOffset = (
  bottomInset: number,
  os: typeof Platform.OS = Platform.OS,
) =>
  os === "android"
    ? Math.max(bottomInset + 8, 12)
    : Math.max(bottomInset - 12, 12);

/**
 * Phần đáy màn bị viên thanh tab đè lên. Màn gốc của tab cuộn dưới viên nên phải
 * chừa chỗ này cuối nội dung cuộn (`TabBarSpacer`), không thì dòng cuối nằm
 * khuất sau viên. Nút nổi góc dưới (vd lên đầu trang) cũng đặt cao hơn mức này.
 */
export const useTabBarOverlap = () =>
  TAB_HEIGHT + getTabBarBottomOffset(useSafeAreaInsets().bottom);

export const TAB_ACTIVE_COLOR = C.red;
export const TAB_INVERTED_BG = "#3A3A3A";
export const TAB_INVERTED_INACTIVE_COLOR = "rgba(255,255,255,0.72)";

/**
 * Cờ đánh dấu màn muốn thanh tab nền tối. Không tự vẽ gì: `ThemeAwareTabBar`
 * so sánh theo tham chiếu rồi thay bằng nền thật với màu mới nhất theo theme.
 */
export const INVERTED_TAB_BAR_MARKER = () => null;

/**
 * Màn quét QR đổi thanh tab sang nền tối; các item con cần biết để chọn màu
 * chữ/icon inactive sáng thay vì xám.
 */
const TabBarInvertedContext = React.createContext(false);

export const TabBarInvertedProvider = TabBarInvertedContext.Provider;

export const useTabBarInverted = () => React.useContext(TabBarInvertedContext);

/**
 * `position: absolute` để màn kéo dài xuống tận đáy, cuộn dưới viên thanh tab.
 * Nền, viền và bóng do `tabBarBackground` vẽ (xem `TabBarBackground`), nên chính
 * thanh tab phải trong suốt, không viền, không `elevation` — Android đổ bóng
 * theo khung chữ nhật của view trong suốt, ra một cái bóng vuông quanh viên.
 *
 * `start` / `end` (không phải `left` / `right`): style gốc của react-navigation
 * đặt `start: 0, end: 0`, mà `start` thắng `left`.
 */
export const createTabBarStyle = ({
  bottomInset,
}: {
  bottomInset: number;
}) => ({
  position: "absolute" as const,
  start: TAB_BAR_SIDE_MARGIN,
  end: TAB_BAR_SIDE_MARGIN,
  bottom: getTabBarBottomOffset(bottomInset),
  height: TAB_HEIGHT,
  paddingBottom: 0,
  paddingHorizontal: 6,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  elevation: 0,
});
