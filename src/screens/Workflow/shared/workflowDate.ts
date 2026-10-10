/**
 * Ngày giờ của view Workflow.
 *
 * Server nhận và trả giờ ĐỊA PHƯƠNG, không "Z" / offset: "2026-10-09T08:00:00".
 * Gửi kèm Z thì server hiểu là UTC và lệch 7 tiếng — nên KHÔNG dùng
 * `toISOString()` ở đây.
 */

const pad = (value: number) => String(value).padStart(2, "0");

const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/;

/** Date → "yyyy-MM-ddTHH:mm:ss" theo giờ máy. */
export const toBeDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

/** Date → "yyyy-MM-ddT00:00:00" (field chỉ có phần ngày). */
export const toBeDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;

/**
 * Chuỗi ngày của server → Date. Chuỗi không offset đọc là giờ địa phương (tự
 * tách số, không phụ thuộc cách engine JS hiểu chuỗi ISO thiếu offset); có Z /
 * offset thì để `Date` tự đổi.
 */
export const parseBeDate = (raw: unknown): Date | null => {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  const text = String(raw).trim();
  const match = LOCAL_DATE_TIME.exec(text);

  if (match) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = match;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss),
    );
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return isNaN(date.getTime()) ? null : date;
};

/** "dd/MM/yyyy". */
export const formatDay = (date: Date | null | undefined) =>
  date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "";

/** "HH:mm". */
export const formatTime = (date: Date | null | undefined) =>
  date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "";

/** "dd/MM/yyyy HH:mm". */
export const formatDayTime = (date: Date | null | undefined) =>
  date ? `${formatDay(date)} ${formatTime(date)}` : "";

/** Chuỗi server → "dd/MM/yyyy" (hoặc kèm giờ). Trống / lỗi → "". */
export const formatBeDate = (raw: unknown, withTime = false) => {
  const date = parseBeDate(raw);
  return withTime ? formatDayTime(date) : formatDay(date);
};

/** Date → "dd-MM-yyyy", định dạng giá trị của `DatePicker`. */
export const toPickerDate = (date: Date | null | undefined) =>
  date ? `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}` : "";

/** Date → "HH:mm", định dạng giá trị của `TimePicker`. */
export const toPickerTime = (date: Date | null | undefined) =>
  date ? formatTime(date) : "";

/** Ghép giá trị của `DatePicker` ("dd-MM-yyyy") + `TimePicker` ("HH:mm"). */
export const fromPickerDateTime = (
  dateValue?: string | null,
  timeValue?: string | null,
): Date | null => {
  if (!dateValue) return null;

  const [d, m, y] = dateValue.split("-").map(Number);
  if (!d || !m || !y) return null;

  const [hh, mm] = (timeValue || "00:00").split(":").map(Number);
  const date = new Date(y, m - 1, d, hh || 0, mm || 0, 0);

  return isNaN(date.getTime()) ? null : date;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Cộng tháng, giữ ngày trong tháng nếu được (31/01 + 1 tháng → 28|29/02). */
export const addMonths = (date: Date, months: number) => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  next.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0);
  return next;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Ngày `date` lúc `hour`:00. */
export const atHour = (date: Date, hour: number, minute = 0) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);
