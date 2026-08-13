import { getMatchedKey } from "../../../utils/Helper";

export type KhachHangSummary = {
  id: number;
  ma: string;
  ten: string;
  /** "Mã - Tên", dùng trong dialog xác nhận để user biết đang sửa đúng ai. */
  label: string;
  /** Toạ độ mốc đang lưu; rỗng nghĩa là khách hàng chưa khai toạ độ. */
  lat: string;
  lng: string;
};

const readField = (raw: Record<string, any>, name: string) => {
  const key = getMatchedKey(raw, name);
  const value = key ? raw[key] : undefined;

  return value === null || value === undefined ? "" : String(value).trim();
};

export const toKhachHangSummary = (raw: any): KhachHangSummary | null => {
  const item = Array.isArray(raw) ? raw[0] : raw;

  if (!item || typeof item !== "object") return null;

  const id = Number(readField(item, "id"));
  if (!Number.isFinite(id) || id <= 0) return null;

  const ma = readField(item, "ma");
  const ten = readField(item, "ten");

  return {
    id,
    ma,
    ten,
    label: [ma, ten].filter(Boolean).join(" - ") || String(id),
    lat: readField(item, "lat"),
    lng: readField(item, "lng"),
  };
};

export const ACCURACY_LIMIT_M = 20;

export const getToaDoRejectReason = (lat: string, lng: string) => {
  const latNumber = Number(lat);
  const lngNumber = Number(lng);

  if (
    !lat ||
    !lng ||
    !Number.isFinite(latNumber) ||
    !Number.isFinite(lngNumber)
  )
    return "Không đọc được toạ độ từ thiết bị. Vui lòng thử lại.";

  if (latNumber === 0 && lngNumber === 0)
    return "Thiết bị trả về toạ độ (0, 0) — nghĩa là chưa định vị được. Bật GPS, ra khu vực thoáng rồi thử lại.";

  if (latNumber < -90 || latNumber > 90 || lngNumber < -180 || lngNumber > 180)
    return "Toạ độ ngoài phạm vi hợp lệ. Vui lòng lấy lại vị trí.";

  return null;
};

/** Dòng phụ của mục menu: toạ độ đang lưu, hoặc câu nhắc khi còn trống. */
export const getKhachHangToaDoLabel = (khachHang: KhachHangSummary) =>
  khachHang.lat && khachHang.lng
    ? `${khachHang.lat}, ${khachHang.lng}`
    : "Chưa có toạ độ";
