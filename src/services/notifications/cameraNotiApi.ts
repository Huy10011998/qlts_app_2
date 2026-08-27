import { API_ENDPOINTS } from "../../config/index";
import { callApi } from "../data/httpClient";

/**
 * Ba API tạm dừng thông báo camera.
 *
 * Cả ba đều yêu cầu quyền `Class.Camera.NotiCameraMobile`:
 * - thiếu quyền → HTTP 403;
 * - token sai/hết hạn → HTTP 401.
 */

/** Phạm vi áp dụng của một lệnh tạm dừng. */
export enum CameraNotiPhamVi {
  /** Chỉ người tạo lệnh ngừng nhận. */
  ChiToi = 0,
  /** CẢ CÔNG TY ngừng nhận — luôn phải hỏi xác nhận trước khi gọi. */
  MoiNguoi = 1,
}

/**
 * Một lệnh tạm dừng do server trả về.
 *
 * ⚠️ Tên trường theo camelCase mặc định của .NET nên các cột `ID_Xxx` thành
 * `iD_Xxx` — chữ D viết hoa, chữ i thường. Đừng đổi thành `id_Camera`/`idCamera`.
 */
export type CameraNotiLenh = {
  id: number;
  /** null = áp dụng cho mọi người (lệnh toàn cục). */
  iD_User: number | null;
  iD_User_MoTa: string | null;
  /** null = áp dụng cho mọi camera. */
  iD_Camera: number | null;
  iD_Camera_Ma: string | null;
  iD_Camera_MoTa: string | null;
  /** Giờ SERVER, không có timezone offset — coi như giờ Việt Nam. */
  tuThoiGian: string;
  denThoiGian: string;
  lyDo: string | null;
  iD_User_Tao: number;
  iD_User_Tao_MoTa: string | null;
  ngayTao: string;
  /** Dùng số này để đếm ngược, ĐỪNG tự cộng soPhut vào giờ máy. */
  soPhutConLai: number;
};

type ApiEnvelope<T> = { message: string; data: T };

export type TamDungNotiCameraInput = {
  /** Bắt buộc > 0, nếu không BE trả HTTP 400. */
  soPhut: number;
  phamVi: CameraNotiPhamVi;
  /** null = mọi camera; truyền ID để chỉ tắt riêng một camera. */
  idCamera?: number | null;
  /** Tuỳ chọn, tối đa 500 ký tự. */
  lyDo?: string;
};

/**
 * Tạo lệnh tạm dừng. Có tác dụng ngay, server không cache.
 *
 * Lệnh mới trùng phạm vi với lệnh đang chạy thì lệnh cũ tự bị huỷ, không chồng
 * nhau — nên cứ gọi thẳng, không cần huỷ trước.
 */
export const tamDungNotiCamera = async (input: TamDungNotiCameraInput) =>
  callApi<ApiEnvelope<CameraNotiLenh>>(
    "POST",
    API_ENDPOINTS.CAMERA_NOTI_TAM_DUNG,
    {
      SoPhut: input.soPhut,
      PhamVi: input.phamVi,
      ID_Camera: input.idCamera ?? null,
      LyDo: input.lyDo?.trim() || null,
    },
  );

/**
 * Các lệnh đang ảnh hưởng tới chính người gọi = lệnh của họ + lệnh toàn cục do
 * người khác tạo. Mảng rỗng nghĩa là đang nhận thông báo bình thường.
 */
export const getTrangThaiNotiCamera = async () =>
  callApi<ApiEnvelope<CameraNotiLenh[]>>(
    "POST",
    API_ENDPOINTS.CAMERA_NOTI_TRANG_THAI,
    {},
  );

/**
 * Bật lại sớm.
 *
 * @param id null = huỷ MỌI lệnh do chính mình tạo. Lệnh toàn cục của người khác
 * chỉ huỷ được khi truyền đúng ID của lệnh đó.
 *
 * Trả về số lệnh đã huỷ; `data = 0` nghĩa là không có gì để huỷ (đã hết hạn
 * hoặc đã huỷ trước đó) — không phải lỗi.
 */
export const huyTamDungNotiCamera = async (id?: number | null) =>
  callApi<ApiEnvelope<number>>(
    "POST",
    API_ENDPOINTS.CAMERA_NOTI_HUY_TAM_DUNG,
    { ID: id ?? null },
  );
