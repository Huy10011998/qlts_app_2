import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LichMode } from "./lichHelpers";

const LICH_MODE_KEY = "@qlts/lich-mode";
const MODES: LichMode[] = ["thang", "tuan", "homnay"];

let saved: LichMode | null = null;

// Đọc ngay khi app nạp module (lúc dựng thanh tab, trước khi mở tab Lịch) để màn
// mở thẳng đúng chế độ lần trước — không hiện Tháng rồi mới nhảy sang Hôm nay.
AsyncStorage.getItem(LICH_MODE_KEY)
  .then((value) => {
    if (MODES.includes(value as LichMode)) saved = value as LichMode;
  })
  .catch(() => {
    // Không đọc được thì mở Tháng như mặc định.
  });

/** Chế độ lần trước trên máy này (Tháng / Tuần / Hôm nay), mặc định Tháng. */
export const getSavedLichMode = (): LichMode => saved ?? "thang";

export const saveLichMode = (mode: LichMode) => {
  saved = mode;
  AsyncStorage.setItem(LICH_MODE_KEY, mode).catch(() => {
    // Lưu hỏng chỉ mất phần nhớ, lần sau mở Tháng.
  });
};
