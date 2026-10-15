import { API_ENDPOINTS } from "../../config/index";
import { callApi } from "../../services/data/httpClient";
import { warn } from "../Logger";

/** Tra địa chỉ cần mạng — quá chừng này thì thôi, dải ảnh hiện toạ độ. */
const REVERSE_TIMEOUT_MS = 4000;

type DiaChiResponse = {
  message?: string;
  data?: { lat?: number; lng?: number; diaChi?: string | null } | null;
};

/** Bỏ ", Việt Nam" cuối chuỗi — ảnh nào cũng ở Việt Nam, chỉ tốn chỗ. */
export const cleanAddress = (address?: string | null) =>
  address?.replace(/,\s*(Việt Nam|Vietnam)\s*$/i, "").trim() || null;

/**
 * Địa chỉ của toạ độ qua BE (9-Mobile-DiaChiTuToaDo, geocoder itracking.vn —
 * cùng nguồn địa chỉ vị trí xe): "114 Nguyễn Huệ, Phường Sài Gòn, TP.HCM".
 * Chỉ gọi lúc cần ghi lên ảnh, đừng gọi theo từng lần GPS cập nhật. `null` khi
 * không mạng, quá giờ, BE không tra được — dải ảnh hiện toạ độ thay vào, không
 * bao giờ ném lỗi.
 */
export const reverseGeocode = async (
  lat: string | number,
  lng: string | number,
): Promise<string | null> => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  // 0,0 là GPS chưa bắt được — BE trả 400.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (!latitude && !longitude)) {
    return null;
  }

  try {
    const response = await callApi<DiaChiResponse>(
      "POST",
      API_ENDPOINTS.DIA_CHI_TU_TOA_DO,
      { Lat: latitude, Lng: longitude },
      { timeout: REVERSE_TIMEOUT_MS },
    );
    return cleanAddress(response?.data?.diaChi);
  } catch (err) {
    warn("[Location] Tra địa chỉ thất bại", err);
    return null;
  }
};
