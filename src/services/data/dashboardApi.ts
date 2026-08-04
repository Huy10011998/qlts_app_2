import { API_ENDPOINTS } from "../../config";
import { getApiErrorMessage } from "../../utils/helpers/api";
import { callApi } from "./httpClient";

export const DASHBOARD_TAISAN_ERROR_MESSAGE =
  "Không lấy được số liệu dashboard. Vui lòng thử lại.";

/**
 * Dữ liệu thô của `POST /Common/get-dashboard-taisan`.
 *
 * Tên field giữ NGUYÊN như server trả về, kể cả nhóm `sL_*` viết chữ L hoa —
 * server camelCase tự động nên `SL_MayMoc` ra `sL_MayMoc`. Đổi sang tên "đẹp"
 * là việc của `mapTaiSanDashboard`, ở đây phải khớp từng ký tự.
 */
export type TaiSanDashboardRaw = {
  thang: number;
  nam: number;
  ngayCapNhat: string;

  // Đếm thiết bị: server luôn có số, không bao giờ null.
  sL_MayMoc: number;
  sL_MayTinh: number;
  sL_Server: number;
  sL_ThietBiCNTT: number;
  sL_DienThoai: number;
  sL_MayIn: number;
  sL_MayQuetMaVach: number;
  sL_ThietBiMang: number;
  /** Tổng 7 loại CNTT, server cộng sẵn — KHÔNG gồm camera. */
  sL_CNTT: number;
  sL_Camera: number;

  // Tiêu thụ của kỳ (thang/nam) — null khi kỳ đó chưa chốt chỉ số đồng hồ.
  dien_TieuThu_VL: number | null;
  dien_TieuThu_BL: number | null;
  nuoc_TieuThu_VL: number | null;
  nuoc_TieuThu_BL: number | null;
  hoi_TieuThu_VL: number | null;
  hoi_TieuThu_BL: number | null;
  solar_TieuThu_VL: number | null;
  solar_TieuThu_BL: number | null;

  // Điểm danh trong NGÀY HIỆN TẠI — null khi không nối được Bravo8.
  tongNhanVien: number | null;
  daDiemDanh: number | null;
  chuaDiemDanh: number | null;

  diemDanh_BoPhan: TaiSanDashboardDeptRaw[] | null;
};

export type TaiSanDashboardDeptRaw = {
  deptCode: string | null;
  tenBoPhan: string | null;
  sttPrintRep: number | null;
  tongNhanVien: number;
  daDiemDanh: number;
  chuaDiemDanh: number;
};

type DashboardEnvelope = {
  message?: string | null;
  data?: TaiSanDashboardRaw | null;
};

/**
 * Một lượt gọi duy nhất dựng cả 4 khối của Trang chủ.
 *
 * Endpoint không có tham số và server không cache: mỗi lượt là một truy vấn
 * xuyên linked server sang Bravo8, nên chỉ gọi khi mở màn hình hoặc khi người
 * dùng chủ động làm mới — tuyệt đối không đặt timer tự tải lại.
 */
export const fetchTaiSanDashboard = async (): Promise<TaiSanDashboardRaw> => {
  let envelope: DashboardEnvelope;

  try {
    envelope = await callApi<DashboardEnvelope>(
      "POST",
      API_ENDPOINTS.GET_DASHBOARD_TAISAN,
      {},
    );
  } catch (error) {
    // Lỗi kỹ thuật đã có log riêng cho IT ở server; người dùng chỉ cần một câu.
    throw new Error(
      getApiErrorMessage(error, DASHBOARD_TAISAN_ERROR_MESSAGE).trim() ||
        DASHBOARD_TAISAN_ERROR_MESSAGE,
    );
  }

  // data == null nghĩa là proc lỗi / không kết nối được SQL. Vài NHÓM số bên
  // trong data vẫn có thể null — đó không phải lỗi toàn màn hình, xem mapper.
  if (envelope?.data == null) {
    throw new Error(
      envelope?.message?.trim() || DASHBOARD_TAISAN_ERROR_MESSAGE,
    );
  }

  return envelope.data;
};
