/**
 * Hàm định dạng số / giờ cho Trang chủ.
 *
 * Tách khỏi `useHomeDashboard` để test được các hàm này mà không phải kéo theo
 * AsyncStorage và cả vòng đời hook.
 */

/** Số liệu không lấy được (null) hiện dấu này, KHÔNG hiện 0. */
export const HOME_NO_DATA = "—";

export const formatHomeNumber = (value: number) => {
  // Tự chèn dấu phân cách nghìn thay vì toLocaleString: kết quả giống nhau trên
  // mọi máy, không phụ thuộc Intl có được bundle vào Hermes hay không.
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));

  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Số có phần thập phân theo cách viết vi-VN: dấu chấm cho nghìn, dấu phẩy cho
 * thập phân. Phần lẻ toàn số 0 thì bỏ luôn — "46 tấn" đọc gọn hơn "46,0 tấn".
 */
export const formatHomeDecimal = (value: number, decimals = 0) => {
  if (decimals <= 0) return formatHomeNumber(value);

  const sign = value < 0 ? "-" : "";
  const [integerPart, fractionPart] = Math.abs(value)
    .toFixed(decimals)
    .split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!fractionPart || Number(fractionPart) === 0) return sign + grouped;

  return `${sign}${grouped},${fractionPart.replace(/0+$/, "")}`;
};

/**
 * Số có thể không lấy được. null -> "—" chứ không phải "0": 0 nghĩa là lấy được
 * và đúng bằng 0 (ví dụ sáng sớm chưa ai quẹt thẻ), null nghĩa là mất số liệu.
 */
export const formatHomeCount = (
  value: number | null | undefined,
  decimals = 0,
) => (typeof value === "number" ? formatHomeDecimal(value, decimals) : HOME_NO_DATA);

/** Tỷ lệ phần trăm, null khi không có mẫu số dùng được. */
export const getHomeRatioPercent = (
  part: number | null | undefined,
  total: number | null | undefined,
) => {
  if (typeof part !== "number" || typeof total !== "number") return null;
  if (total <= 0) return null;

  return Math.min(100, Math.max(0, (part / total) * 100));
};

/** Phần trăm hiển thị: 1 số lẻ theo quy ước của dashboard (ví dụ "20,5%"). */
export const formatHomePercent = (percent: number | null) =>
  percent == null ? HOME_NO_DATA : `${formatHomeDecimal(percent, 1)}%`;

/** API trả tiền theo đồng; dashboard luôn hiển thị theo tỷ. */
export const HOME_BILLION = 1_000_000_000;

/**
 * Số tiền VND của API đổi sang "tỷ", một số lẻ.
 *
 * Để nguyên số đồng thì cột toàn số 12 chữ số, trên màn hình điện thoại là vỡ
 * layout — nên đơn vị "tỷ" phải ghi ở tiêu đề cột / nhãn đi kèm.
 */
export const formatHomeBillion = (value: number) =>
  formatHomeDecimal(value / HOME_BILLION, 1);

/** Nhãn kỳ tiêu thụ, in đúng thang/nam server trả về. */
export const formatHomePeriodLabel = (month: number, year: number) =>
  month > 0 && year > 0 ? `Tháng ${month}/${year}` : "";

/**
 * Giờ:phút của thời điểm SQL chạy proc.
 *
 * `ngayCapNhat` là giờ server và không kèm múi giờ ("2026-08-04T14:57:44.32"),
 * nên lấy thẳng HH:mm trong chuỗi. Để `new Date` xử lý thì máy đặt lệch múi giờ
 * sẽ hiện một giờ khác giờ server.
 */
export const formatHomeUpdatedAt = (updatedAt: string | undefined) => {
  if (!updatedAt) return null;

  const plainTime = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/.exec(updatedAt);

  if (plainTime) return `${plainTime[1]}:${plainTime[2]}`;

  const parsed = new Date(updatedAt);

  if (Number.isNaN(parsed.getTime())) return null;

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};
