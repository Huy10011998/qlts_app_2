import { makeDay } from "./calendarGrid";

/**
 * Chuỗi ngày của ô chọn → `Date`, hoặc `null` khi rỗng / không đọc được.
 *
 * Nhận "dd-MM-yyyy" (giá trị `DatePicker` trả ra) và "yyyy-MM-dd…" (giá trị thô
 * BE trả về, có form chưa kịp chuẩn hoá trước khi vẽ).
 */
export const parsePickerDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const text = String(value).trim();

  let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (match) return makeDay(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

  match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return makeDay(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return null;
};

/**
 * Cách ô ngày hiển thị: "22-10-2026" → "22/10/2026", cách ghi quen của người
 * Việt và khớp với lịch, tiêu đề màn. Chỉ đổi phần hiển thị — giá trị gửi đi vẫn
 * là "dd-MM-yyyy". Chuỗi khác định dạng thì để nguyên.
 */
export const formatPickerDisplayDate = (value?: string) =>
  value && /^\d{2}-\d{2}-\d{4}$/.test(value) ? value.replace(/-/g, "/") : value;

/**
 * Đến ngày sau khi người dùng đổi Từ ngày ở bộ lọc / form không có giờ: rơi về
 * trước Từ ngày mới thì dời về bằng Từ ngày, còn lại giữ nguyên. Một bên còn
 * trống thì không đụng.
 */
export const nextRangeEnd = (nextStart: string, end: string) => {
  const start = parsePickerDate(nextStart);
  const current = parsePickerDate(end);
  if (!start || !current) return end;
  return current.getTime() < start.getTime() ? nextStart : end;
};

/**
 * Tên trường của cặp Từ ngày – Đến ngày trong form động và tham số báo cáo
 * (cùng quy ước `ReportView` dùng để chặn Từ ngày lớn hơn Đến ngày). So không
 * phân biệt hoa thường: metadata có nơi ghi `TuNgay`, có nơi `tuNgay`.
 */
export const RANGE_START_FIELD = "tungay";
export const RANGE_END_FIELD = "denngay";

/** Khoá thật trong `formData` của trường tên `lowerName` (không phân biệt hoa thường). */
export const findFieldKey = (
  formData: Record<string, unknown> | undefined,
  lowerName: string
) => Object.keys(formData ?? {}).find((key) => key.toLowerCase() === lowerName);
