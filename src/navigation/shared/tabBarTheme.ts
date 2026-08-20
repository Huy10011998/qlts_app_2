import React from "react";
import { C } from "../../utils/helpers/colors";

/** Chiều cao thanh tab, chưa tính safe area dưới. */
/**
 * Chiều cao thanh tab, khoá cứng vì phải khớp với SVG nền (`HUMP_RISE`) và độ
 * nhô của nút quét (`SCAN_BUTTON_RISE`). Đổi số này là phải chỉnh cả hai chỗ đó.
 *
 * Vì thế nhãn tab trong `TabBarItemButton` / `ScanTabButton` giữ
 * `allowFontScaling={false}` — đây là chỗ duy nhất trong ứng dụng cố tình không
 * đi theo cỡ chữ hệ thống, đánh đổi lấy việc thanh tab không vỡ.
 */
export const TAB_HEIGHT = 62;

/** Đường kính vòng tròn Quét QR. */
export const SCAN_BUTTON_SIZE = 48;

/**
 * Vòng tròn nhô lên bao nhiêu so với mép trên thanh tab. Phần nhô được vẽ tràn
 * ra ngoài thanh tab: không thể làm thanh tab cao thêm rồi chừa dải trong suốt,
 * vì phía sau thanh tab là nền của navigator nên dải đó hiện ra thành một băng
 * đặc che nội dung. Đổi lại, trên Android phần tràn ra ngoài bounds không nhận
 * touch — vẫn bấm được vì vùng bấm của nút phủ kín ô tab bên trong thanh tab.
 */
export const SCAN_BUTTON_RISE = 12;

/**
 * Mu cong ở mép trên thanh tab: nhô cao `HUMP_RISE` và trải rộng
 * `HUMP_HALF_WIDTH` về mỗi bên tính từ giữa thanh tab. Vẽ bằng hai đoạn Bézier
 * nên nối vào đoạn thẳng hai bên theo tiếp tuyến ngang, không gãy khúc.
 */
export const HUMP_RISE = 20;
export const HUMP_HALF_WIDTH = 56;

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
 * Nền và viền trên do `tabBarBackground` vẽ (xem `TabBarBackground`), nên chính
 * thanh tab phải trong suốt và không viền.
 */
export const createTabBarStyle = ({
  bottomInset,
}: {
  bottomInset: number;
}) => ({
  backgroundColor: "transparent",
  borderTopWidth: 0,
  height: TAB_HEIGHT + bottomInset,
  paddingBottom: bottomInset,
});
