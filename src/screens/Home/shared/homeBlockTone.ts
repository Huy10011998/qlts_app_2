import { createContext, useContext, useMemo } from "react";
import type { ViewStyle } from "react-native";

import { useAppColors, useSchemeColor } from "../../../utils/helpers/colors";
import type { HomeBlockKey } from "./homeBlockOrder";

/**
 * Màu nhận diện của từng khối Trang chủ: nhãn tiêu đề nền đặc, viền card, đường
 * kẻ cạnh nhãn và chấm trên hàng chip đi tới khối đều lấy từ đây — lướt nhanh
 * vẫn biết card nào thuộc nhóm nào.
 */
export type HomeBlockTone = {
  /**
   * Nền nhãn tiêu đề, và cũng là viền + mép trên của card trong khối — card
   * cùng màu với nhãn của nó. Chữ trắng nằm trên nhãn nên phải đủ đậm (≥ 4.5:1).
   */
  label: string;
  /** Đường kẻ cạnh nhãn, chấm trên hàng chip, chấm trang đang xem. */
  accent: string;
};

export const HOME_BLOCK_TONES: Record<HomeBlockKey, HomeBlockTone> = {
  stats: { label: "#2563EB", accent: "#3B82F6" },
  shortcuts: { label: "#E31E24", accent: "#E31E24" },
  // Cam #F59E0B quá nhạt cho chữ trắng, nhãn dùng tông đậm hơn.
  workflow: { label: "#B45309", accent: "#F59E0B" },
  assetStructure: { label: "#7C3AED", accent: "#8B5CF6" },
  attendance: { label: "#047857", accent: "#10B981" },
  utilities: { label: "#0369A1", accent: "#0EA5E9" },
};

/**
 * Tên ngắn trên hàng chip đi tới khối. Tên đầy đủ (`HOME_BLOCK_META`) dài tới
 * cả câu, một chip mang tên đó chiếm gần hết bề ngang màn.
 */
export const HOME_BLOCK_SHORT_LABELS: Record<HomeBlockKey, string> = {
  stats: "Số liệu",
  shortcuts: "Truy cập nhanh",
  workflow: "Công việc",
  assetStructure: "Tài sản",
  attendance: "Điểm danh",
  utilities: "Tiêu thụ",
};

/**
 * Nền Trang chủ (giao diện sáng) đậm hơn nền chung `bg` một nấc: card trắng
 * trên #F0F2F8 gần như lẫn vào nền. Giao diện tối thì card và nền vốn đã chênh
 * rõ nên giữ `bg`.
 */
const HOME_PAGE_BG_LIGHT = "#E8ECF3";
/**
 * Viền của thứ không thuộc khối nào (chip, khung chờ lúc chưa biết khối) — giao
 * diện sáng. Tối thì không cần viền, giữ như `hairline`.
 */
const HOME_CARD_BORDER_LIGHT = "#DCE2EB";

export const useHomePageBackground = () =>
  useSchemeColor(HOME_PAGE_BG_LIGHT, useAppColors().bg);

/** Màu nhóm của khối đang bọc card; card nằm ngoài khối thì là null. */
export const HomeBlockToneContext = createContext<HomeBlockTone | null>(null);

export const useHomeBlockTone = () => useContext(HomeBlockToneContext);

type HomeCardChromeArgs = {
  borderColor: string;
  shadowColor: string;
  /** Mép trên 3pt. Không có thì card chỉ có viền thường. */
  accent?: string | null;
};

/**
 * Viền, bóng và mép trên màu nhóm cho mọi card trên Trang chủ — để một chỗ cho
 * các card khỏi mỗi cái một kiểu bóng.
 */
export const getHomeCardChrome = ({
  borderColor,
  shadowColor,
  accent,
}: HomeCardChromeArgs): ViewStyle => ({
  borderWidth: 1,
  borderColor,
  ...(accent ? { borderTopWidth: 3, borderTopColor: accent } : null),
  shadowColor,
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
});

/**
 * Bản hook của `getHomeCardChrome`: viền và mép trên cùng màu nhãn của khối đang
 * bọc card. `accent` truyền vào thì thắng màu khối ở cả viền lẫn mép trên — ô
 * Truy cập nhanh tô theo màu riêng của loại mục (chức năng / phương tiện / báo
 * cáo), không theo màu khối.
 */
export function useHomeCardChrome(accent?: string): ViewStyle {
  const colors = useAppColors();
  const tone = useHomeBlockTone();
  const neutralBorderColor = useSchemeColor(
    HOME_CARD_BORDER_LIGHT,
    colors.hairline,
  );
  const borderColor = accent ?? tone?.label ?? neutralBorderColor;
  const resolvedAccent = accent ?? tone?.label ?? null;

  return useMemo(
    () =>
      getHomeCardChrome({
        borderColor,
        shadowColor: colors.shadow,
        accent: resolvedAccent,
      }),
    [borderColor, colors.shadow, resolvedAccent],
  );
}

/** Viền trung tính cho thứ không thuộc khối nào (chip trên hàng đi tới khối). */
export function useHomeCardBorderColor() {
  return useSchemeColor(HOME_CARD_BORDER_LIGHT, useAppColors().hairline);
}
