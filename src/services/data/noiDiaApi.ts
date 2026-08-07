import axios from "axios";
import { Buffer } from "buffer";

import { API_ENDPOINTS } from "../../config/index";
import { getMatchedKey } from "../../utils/Helper";
import { warn } from "../../utils/Logger";
import { api, callApi } from "./httpClient";

/**
 * Nội địa – tủ lạnh: xác nhận vị trí và trung chuyển.
 *
 * Hai nhóm API này không đi qua khuôn `get-list`/`insert` chung của tài sản mà
 * có controller riêng, cùng chung quy ước response `{ message, data }`:
 * `data` là kết quả (null = thất bại), `message` là câu tiếng Việt viết sẵn để
 * hiện thẳng cho người dùng.
 */

export type NoiDiaResponse<T> = {
  message?: string;
  data: T | null;
};

/**
 * BE serialize các cột `ID_...` thành `iD_...` (i thường, D hoa) chứ không phải
 * `id_...` — ví dụ `iD_NoiDia_KhachHang_MoTa`. Lệch đúng một ký tự nên mọi field
 * vị trí đọc ra `undefined` và bảng hiện toàn dấu gạch.
 *
 * Thêm bí danh `id_...` cho từng key thay vì đổi tên: giữ luôn key gốc nên nếu
 * BE sửa lại cho đúng thì cũng không hỏng, và không phải rải `getMatchedKey`
 * khắp các màn.
 */
export const withIdAliases = <T,>(row: T): T => {
  if (!row || typeof row !== "object") return row;

  const source = row as Record<string, unknown>;
  const aliased: Record<string, unknown> = { ...source };

  Object.keys(source).forEach((key) => {
    if (!/^iD(?=[_A-Z])/.test(key)) return;

    const canonical = `id${key.slice(2)}`;
    if (!(canonical in aliased)) aliased[canonical] = source[key];
  });

  return aliased as T;
};

/** Áp `withIdAliases` cho `data` của một response dạng mảng. */
const normalizeNoiDiaRows = <T,>(
  response: NoiDiaResponse<T[]>,
): NoiDiaResponse<T[]> => ({
  ...response,
  data: Array.isArray(response?.data) ? response.data.map(withIdAliases) : null,
});

/** Một lượt xác nhận vị trí (bảng XacNhanViTri_TuLanh). */
export type XacNhanViTriTuLanhItem = {
  id: number;
  ngayXacNhan?: string | null;
  id_NoiDia_TuLanh?: number | null;
  ghiChu?: string | null;
  filePath?: string | null;
  lat?: string | null;
  lng?: string | null;
  /** "Mã - Tên" của tủ lạnh. */
  id_NoiDia_TuLanh_MoTa?: string | null;
  serialNumber?: string | null;
  /** Người thực hiện xác nhận (chỉ có ở API lịch sử). */
  log_ID_User_MoTa?: string | null;

  /** Toạ độ đăng ký của khách hàng đang giữ tủ (chỉ có ở API lịch sử). */
  noiDia_KhachHang_LAT?: string | null;
  noiDia_KhachHang_LNG?: string | null;
  /**
   * Khoảng cách (mét) từ chỗ chụp ảnh tới toạ độ khách hàng — server tự tính.
   * `null` khi thiếu một trong hai toạ độ, không phải là 0.
   */
  khoangCachMet?: number | null;
};

/** Ảnh gửi lên: đúng shape `react-native-image-picker` trả về sau khi chụp. */
export type XacNhanViTriPhoto = {
  uri: string;
  name: string;
  type: string;
};

export type XacNhanViTriPayload = {
  idNoiDiaTuLanh: number;
  photo: XacNhanViTriPhoto;
  ghiChu?: string;
  lat?: string;
  lng?: string;
};

/**
 * Gửi một lượt xác nhận vị trí.
 *
 * multipart/form-data, KHÔNG phải JSON. `NgayXacNhan` cố tình không gửi để
 * server lấy giờ hệ thống — app không cho user sửa ngày xác nhận.
 *
 * ⚠️ Mỗi lần gọi tạo một dòng lịch sử MỚI, API không chống trùng: chỉ retry khi
 * thật sự lỗi mạng, đã nhận được `data` thì tuyệt đối không gọi lại.
 */
export const xacNhanViTriTuLanh = async ({
  idNoiDiaTuLanh,
  photo,
  ghiChu,
  lat,
  lng,
}: XacNhanViTriPayload) => {
  const form = new FormData();

  form.append("ID_NoiDia_TuLanh", String(idNoiDiaTuLanh));
  form.append("File", {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  } as any);

  if (ghiChu?.trim()) form.append("GhiChu", ghiChu.trim());
  if (lat) form.append("LAT", lat);
  if (lng) form.append("LNG", lng);

  return callApi<NoiDiaResponse<XacNhanViTriTuLanhItem>>(
    "POST",
    API_ENDPOINTS.XAC_NHAN_VI_TRI_TU_LANH,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      // Ảnh chụp hiện trường qua mạng yếu: rộng tay hơn 15s mặc định.
      timeout: 60000,
    },
  );
};

/**
 * `Top` mặc định của cả hai API lịch sử. Không gửi `Top` thì server tự cắt ở
 * mốc này, và không có phân trang — danh sách chạm đúng 500 dòng nghĩa là có
 * thể còn dòng cũ hơn bị bỏ, phải nói cho người dùng biết.
 */
export const NOI_DIA_LICH_SU_TOP = 500;

export type XacNhanViTriLichSuFilter = {
  idNoiDiaTuLanh?: number;
  tuNgay?: string;
  denNgay?: string;
  timKiem?: string;
  top?: number;
};

/** Lịch sử xác nhận, mới nhất trước. Mọi field lọc đều tuỳ chọn. */
export const getXacNhanViTriTuLanhLichSu = async ({
  idNoiDiaTuLanh,
  tuNgay,
  denNgay,
  timKiem,
  top,
}: XacNhanViTriLichSuFilter = {}) =>
  normalizeNoiDiaRows(
    await callApi<NoiDiaResponse<XacNhanViTriTuLanhItem[]>>(
      "POST",
      API_ENDPOINTS.XAC_NHAN_VI_TRI_TU_LANH_LICH_SU,
      {
        ID_NoiDia_TuLanh: idNoiDiaTuLanh,
        TuNgay: tuNgay,
        DenNgay: denNgay,
        TimKiem: timKiem,
        Top: top,
      },
    ),
  );

/** Một lần trung chuyển: 5 cấp vị trí cũ + 5 cấp mới (hậu tố `_Moi`). */
export type TrungChuyenTuLanhItem = {
  id: number;
  ngayTrungChuyen?: string | null;
  id_NoiDia_TuLanh?: number | null;
  notes?: string | null;

  id_NoiDia_Mien_MoTa?: string | null;
  id_NoiDia_VungMien_MoTa?: string | null;
  id_NoiDia_KhuVuc_MoTa?: string | null;
  id_NoiDia_NhaPhanPhoi_MoTa?: string | null;
  id_NoiDia_KhachHang_MoTa?: string | null;

  id_NoiDia_Mien_Moi_MoTa?: string | null;
  id_NoiDia_VungMien_Moi_MoTa?: string | null;
  id_NoiDia_KhuVuc_Moi_MoTa?: string | null;
  id_NoiDia_NhaPhanPhoi_Moi_MoTa?: string | null;
  id_NoiDia_KhachHang_Moi_MoTa?: string | null;

  id_NoiDia_TuLanh_MoTa?: string | null;
  serialNumber?: string | null;
  log_ID_User_MoTa?: string | null;
};

/**
 * Lịch sử trung chuyển của MỘT tủ, mới nhất trước.
 *
 * `ID_NoiDia_TuLanh` bắt buộc: bỏ trống hoặc <= 0 thì server trả mảng rỗng (cố
 * tình không cho lấy toàn bộ lịch sử của mọi tủ).
 */
export const getTrungChuyenTuLanhLichSu = async (
  idNoiDiaTuLanh: number,
  top?: number,
) =>
  normalizeNoiDiaRows(
    await callApi<NoiDiaResponse<TrungChuyenTuLanhItem[]>>(
      "POST",
      API_ENDPOINTS.TRUNG_CHUYEN_TU_LANH_LICH_SU,
      { ID_NoiDia_TuLanh: idNoiDiaTuLanh, Top: top },
    ),
  );

export type NhaPhanPhoiItem = {
  id: number;
  ma?: string | null;
  ten?: string | null;
  id_NoiDia_Mien_MoTa?: string | null;
  id_NoiDia_VungMien_MoTa?: string | null;
  id_NoiDia_KhuVuc_MoTa?: string | null;
};

export type KhachHangItem = {
  id: number;
  ma?: string | null;
  ten?: string | null;
  id_NoiDia_Mien_MoTa?: string | null;
  id_NoiDia_VungMien_MoTa?: string | null;
  id_NoiDia_KhuVuc_MoTa?: string | null;
  id_NoiDia_NhaPhanPhoi_MoTa?: string | null;
};

/** Danh sách NPP đang hoạt động, đã sắp theo tên. Cỡ trăm dòng → nên cache. */
export const getTrungChuyenNhaPhanPhoi = async () =>
  normalizeNoiDiaRows(
    await callApi<NoiDiaResponse<NhaPhanPhoiItem[]>>(
      "POST",
      API_ENDPOINTS.TRUNG_CHUYEN_TU_LANH_NHA_PHAN_PHOI,
      {},
    ),
  );

/**
 * Khách hàng của một NPP. Server tự lọc thêm theo miền / vùng miền / khu vực
 * lấy từ chính NPP, app không cần gửi mấy field đó.
 *
 * ⚠️ Một NPP có thể hơn 1.000 khách hàng → màn gọi phải có ô tìm kiếm.
 */
export const getTrungChuyenKhachHang = async (idNhaPhanPhoi: number) =>
  normalizeNoiDiaRows(
    await callApi<NoiDiaResponse<KhachHangItem[]>>(
      "POST",
      API_ENDPOINTS.TRUNG_CHUYEN_TU_LANH_KHACH_HANG,
      { ID_NoiDia_NhaPhanPhoi: idNhaPhanPhoi },
    ),
  );

export const KHACH_HANG_NAME_CLASS = "NoiDia_KhachHang";

/**
 * Ba cấp vị trí của một khách hàng, đọc từ chính record khách hàng.
 *
 * `get-list-khach-hang` chỉ trả id/mã/tên nên màn xác nhận trung chuyển không
 * có gì để hiện ở cột "ĐẾN". Bản thân record thì có đủ (lưới "Danh sách Khách
 * hàng" trên web hiện đúng ba cột này), nên lấy qua API chi tiết dùng chung.
 *
 * Trả `null` khi không đọc được — chỉ ảnh hưởng phần hiển thị, không được chặn
 * luồng gửi.
 */
export const getKhachHangLocation = async (id: number) => {
  try {
    const response = await callApi<any>(
      "POST",
      `/${KHACH_HANG_NAME_CLASS}/get-details`,
      { id },
    );

    const raw = response?.data;
    const item = Array.isArray(raw) ? raw[0] : raw;
    if (!item || typeof item !== "object") return null;

    const read = (name: string) => {
      const key = getMatchedKey(item, name);
      const value = key ? item[key] : undefined;

      return value === null || value === undefined ? "" : String(value).trim();
    };

    return {
      mien: read("id_NoiDia_Mien_MoTa"),
      vungMien: read("id_NoiDia_VungMien_MoTa"),
      khuVuc: read("id_NoiDia_KhuVuc_MoTa"),
      nhaPhanPhoi: read("id_NoiDia_NhaPhanPhoi_MoTa"),
    };
  } catch (e) {
    warn("[NoiDia] Không đọc được vị trí khách hàng", e);
    return null;
  }
};

/** `data` của API trung chuyển: số tủ đã cập nhật, hoặc mã lỗi âm. */
export const TRUNG_CHUYEN_LOCKED = -10;

/**
 * Tạo yêu cầu trung chuyển. ÁP DỤNG NGAY, không có bước chờ duyệt — màn gọi
 * phải tự chặn double-submit vì gửi 2 lần là 2 dòng lịch sử.
 *
 * App không gửi miền / vùng miền / khu vực / NPP mới: server suy ra từ khách
 * hàng được chọn.
 */
export const trungChuyenTuLanh = async ({
  ids,
  idKhachHangMoi,
  notes,
}: {
  ids: number[];
  idKhachHangMoi: number;
  notes?: string;
}) =>
  callApi<NoiDiaResponse<number>>("POST", API_ENDPOINTS.TRUNG_CHUYEN_TU_LANH, {
    IDs: ids,
    ID_NoiDia_KhachHang_Moi: idKhachHangMoi,
    Notes: notes?.trim() || undefined,
  });

/**
 * Tải ảnh xác nhận đã lưu, trả về base64 để nhét thẳng vào `<Image source>`.
 *
 * Body là một chuỗi JSON (có dấu nháy kép) chứ không phải object — `filePath`
 * nhận từ API xác nhận, hoặc đường dẫn `_resize` cho thumbnail.
 */
export const getNoiDiaImageBase64 = async (filePath: string) => {
  const response = await api.post(
    API_ENDPOINTS.PREVIEW_ATTACH_PROPERTY,
    JSON.stringify(filePath),
    {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "Content-Type": "application/json" },
    },
  );

  return Buffer.from(response.data, "binary").toString("base64");
};

const PERMISSION_DENIED_MESSAGE =
  "Tài khoản không có quyền thực hiện chức năng này";

/**
 * Lấy câu thông báo để hiện cho user từ một lỗi của nhóm API nội địa.
 *
 * 400 → `message` trong body đã là tiếng Việt, hiện thẳng.
 * 403 → KHÔNG có body, phải tự dựng câu.
 */
export const getNoiDiaErrorMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;

  if (err.response?.status === 403) return PERMISSION_DENIED_MESSAGE;

  const body = err.response?.data;
  const message =
    typeof body === "object" && body !== null
      ? (body as { message?: string }).message
      : undefined;

  return message?.trim() || fallback;
};
