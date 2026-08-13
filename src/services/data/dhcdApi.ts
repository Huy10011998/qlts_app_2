import { callApi } from "./httpClient";
import { API_ENDPOINTS } from "../../config/index";

/**
 * Hai class quyền của màn đại hội cổ đông trên mobile, đúng tên bảng server.
 *
 * `Read` cho từng tab, `Insert` cho thao tác ghi (điểm danh / lưu ý kiến cổ
 * đông), `Delete` cho huỷ điểm danh. Xem được không có nghĩa là được ghi — có
 * người chỉ theo dõi tiến độ đại hội.
 */
export const DHCD_DIEM_DANH_NAME_CLASS = "DaiHoiCoDong_CoDong_DiemDanh";
export const DHCD_Y_KIEN_NAME_CLASS = "DaiHoiCoDong_CoDong_YKien";

export const getActiveDhcd = async <T = any,>() =>
  callApi<T>("POST", API_ENDPOINTS.GET_ACTIVE_DHCD);

export const getCodongDhcd = async <T = any,>(dhcdId: string) =>
  callApi<T>(
    "POST",
    `${API_ENDPOINTS.GET_CODONG_DHCD}?dhcdId=${encodeURIComponent(dhcdId)}`,
  );

export const diemDanhDhcd = async <T = any,>(iD_DaiHoiCoDong_CoDong: number) =>
  callApi<T>("POST", API_ENDPOINTS.DIEM_DANH_DHCD, {
    iD_DaiHoiCoDong_CoDong,
  });

export const huyDiemDanhDhcd = async <T = any,>(
  iD_DaiHoiCoDong_CoDong: number,
) =>
  callApi<T>("POST", API_ENDPOINTS.HUY_DIEM_DANH_DHCD, {
    iD_DaiHoiCoDong_CoDong,
  });

export const luuYKienCoDongDhcd = async <T = any,>(payload: {
  iD_DaiHoiCoDong_YKien: number;
  iD_DaiHoiCoDong_CoDongs: string;
  trangThais: string;
  nguoiNhap: number;
}) => callApi<T>("POST", API_ENDPOINTS.LUU_Y_KIEN_CO_DONG_DHCD, payload);
