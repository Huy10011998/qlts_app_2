/**
 * Phần tính toán của bộ chọn ngày tự vẽ (Android) — tách khỏi component để test
 * không cần dựng giao diện.
 */

/** Tuần bắt đầu từ Thứ Hai như lịch tiếng Việt của Google / Samsung. */
export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/** Cột Chủ Nhật trong lưới (cột cuối) — tô đỏ như lịch giấy. */
export const SUNDAY_COLUMN = 6;

const WEEKDAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
] as const;

/** Số ô của lưới ngày: luôn 6 tuần để lật tháng không làm sheet nhảy chiều cao. */
export const MONTH_GRID_CELLS = 42;

/** Số năm trên một trang chọn năm (lưới 3 × 4). */
export const YEAR_PAGE_SIZE = 12;

const pad2 = (n: number) => String(n).padStart(2, "0");

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Ngày giữ ở 12:00 trưa, cùng quy ước với `parseDate`: đổi múi giờ hay giờ mùa
 * hè cũng không đẩy được sang ngày bên cạnh.
 */
export const makeDay = (year: number, month: number, day: number) =>
  new Date(year, month, day, 12, 0, 0);

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

/**
 * 42 ô của một tháng, bắt đầu từ Thứ Hai. Ô không thuộc tháng là `null` — để
 * trống như lịch Material thay vì in mờ ngày tháng bên cạnh.
 */
export const buildMonthCells = (year: number, month: number) => {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = daysInMonth(year, month);

  return Array.from({ length: MONTH_GRID_CELLS }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= total ? makeDay(year, month, day) : null;
  });
};

/** Lùi/tiến `delta` tháng, trả về cặp năm–tháng đã chuẩn hoá. */
export const shiftMonth = (year: number, month: number, delta: number) => {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
};

/**
 * Giữ nguyên ngày khi đổi tháng/năm, chỉ hạ xuống ngày cuối nếu tháng mới ngắn
 * hơn (31/03 → tháng 2 thành 28 hoặc 29/02).
 */
export const withYearMonth = (date: Date, year: number, month: number) =>
  makeDay(year, month, Math.min(date.getDate(), daysInMonth(year, month)));

/**
 * Khoá so sánh theo ngày (yyyymmdd) — bỏ qua giờ phút, khỏi lo hai `Date` cùng
 * ngày mà khác giờ thì so ra lệch.
 */
export const dayKey = (date: Date) =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

/** Khoảng ngày được chọn; đầu nào `null` / bỏ trống là không giới hạn đầu đó. */
export type DayLimits = { minDate?: Date | null; maxDate?: Date | null };

export const isDayOutOfRange = (date: Date, { minDate, maxDate }: DayLimits) =>
  (!!minDate && dayKey(date) < dayKey(minDate)) ||
  (!!maxDate && dayKey(date) > dayKey(maxDate));

/** Cả tháng nằm ngoài khoảng (không còn ngày nào chọn được). */
export const isMonthOutOfRange = (
  year: number,
  month: number,
  { minDate, maxDate }: DayLimits
) =>
  (!!minDate &&
    dayKey(makeDay(year, month, daysInMonth(year, month))) < dayKey(minDate)) ||
  (!!maxDate && dayKey(makeDay(year, month, 1)) > dayKey(maxDate));

/** Cả năm nằm ngoài khoảng. */
export const isYearOutOfRange = (year: number, { minDate, maxDate }: DayLimits) =>
  (!!minDate && year < minDate.getFullYear()) ||
  (!!maxDate && year > maxDate.getFullYear());

/** Kéo ngày về trong khoảng (giữ ở 12:00 như `makeDay`). */
export const clampDay = (date: Date, { minDate, maxDate }: DayLimits) => {
  if (minDate && dayKey(date) < dayKey(minDate)) {
    return makeDay(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  }
  if (maxDate && dayKey(date) > dayKey(maxDate)) {
    return makeDay(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
  }
  return date;
};

/** Trang năm mở ra có năm đang chọn ở giữa lưới (ô thứ 6). */
export const yearPageStartFor = (year: number) => year - 5;

/** "Thứ Năm, 22/10/2026" — dòng tóm tắt trên đầu sheet. */
export const formatLongDate = (date: Date) =>
  `${WEEKDAY_NAMES[date.getDay()]}, ${pad2(date.getDate())}/${pad2(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;

/** "Tháng 10/2026" — cùng cách ghi với lịch của màn Điện mặt trời. */
export const formatMonthTitle = (year: number, month: number) =>
  `Tháng ${month + 1}/${year}`;
