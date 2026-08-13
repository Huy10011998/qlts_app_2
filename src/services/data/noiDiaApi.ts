import axios from "axios";
import { Buffer } from "buffer";

import { API_ENDPOINTS } from "../../config/index";
import { getMatchedKey } from "../../utils/Helper";
import { warn } from "../../utils/Logger";
import { api, callApi } from "./httpClient";

export type NoiDiaResponse<T> = {
  message?: string;
  data: T | null;
};

export const withIdAliases = <T>(row: T): T => {
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
const normalizeNoiDiaRows = <T>(
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

  /**
   * Trạng thái sử dụng của tủ LÚC XÁC NHẬN (snapshot). Có thể khác trạng thái
   * hiện tại của tủ — đừng dùng để hiện trạng thái tủ ở màn khác.
   */
  id_TrangThaiSuDung?: number | null;
  id_TrangThaiSuDung_MoTa?: string | null;

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
  /**
   * Trạng thái sử dụng của tủ lúc xác nhận. Bỏ trống thì server tự lấy trạng
   * thái hiện tại của tủ, nên bản cũ không gửi field này vẫn chạy đúng.
   */
  idTrangThaiSuDung?: number;
};

export const xacNhanViTriTuLanh = async ({
  idNoiDiaTuLanh,
  photo,
  ghiChu,
  lat,
  lng,
  idTrangThaiSuDung,
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
  if (idTrangThaiSuDung)
    form.append("ID_TrangThaiSuDung", String(idTrangThaiSuDung));

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

/** Một dòng danh mục trạng thái sử dụng: hiện `text`, gửi lên `id`. */
export type TrangThaiSuDungOption = {
  id: number;
  text: string;
};

/**
 * Danh mục trạng thái sử dụng cho combobox màn xác nhận vị trí.
 *
 * Ít dòng và gần như không đổi nên cache lại sau lần gọi đầu; chỉ cache khi có
 * dữ liệu để lần sau còn thử lại được.
 */
let trangThaiSuDungCache: TrangThaiSuDungOption[] | null = null;

export const getTrangThaiSuDungOptions = async () => {
  if (trangThaiSuDungCache) return trangThaiSuDungCache;

  const response = await callApi<{
    data?: { items?: Array<{ id?: unknown; text?: unknown }> };
  }>("POST", API_ENDPOINTS.GET_CATEGORY, {
    Type: "DM_TrangThaiSuDung",
    lstParent: "",
    currentID: [],
    PageSize: 100,
    SkipSize: 0,
  });

  const options = (response?.data?.items ?? []).reduce<TrangThaiSuDungOption[]>(
    (acc, item) => {
      const id = Number(item?.id);
      const text = String(item?.text ?? "").trim();

      if (Number.isFinite(id) && id > 0 && text) acc.push({ id, text });

      return acc;
    },
    [],
  );

  if (options.length) trangThaiSuDungCache = options;

  return options;
};

/**
 * Hai class quyền của nghiệp vụ tủ lạnh nội địa, lấy đúng tên bảng server dùng
 * trong đường dẫn API (`/XacNhanViTri_TuLanh/…`, `/TrungChuyen_TuLanh/…`).
 *
 * Dùng bộ action chuẩn: `Read` để xem lịch sử, `Insert` để tạo lượt mới.
 */
export const XAC_NHAN_VI_TRI_NAME_CLASS = "XacNhanViTri_TuLanh";
export const TRUNG_CHUYEN_NAME_CLASS = "TrungChuyen_TuLanh";

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

export const getTrungChuyenKhachHang = async (idNhaPhanPhoi: number) =>
  normalizeNoiDiaRows(
    await callApi<NoiDiaResponse<KhachHangItem[]>>(
      "POST",
      API_ENDPOINTS.TRUNG_CHUYEN_TU_LANH_KHACH_HANG,
      { ID_NoiDia_NhaPhanPhoi: idNhaPhanPhoi },
    ),
  );

export const KHACH_HANG_NAME_CLASS = "NoiDia_KhachHang";
export const CAP_NHAT_TOA_DO_ACTION = "CapNhatToaDo";

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

/**
 * Khách hàng SAU khi ghi đè toạ độ.
 *
 * Lấy lat/lng từ đây để hiện lại, đừng giả định server lưu đúng chuỗi app gửi:
 * server nhận cả dấu phẩy thập phân nhưng luôn lưu về dạng dấu chấm.
 */
export type KhachHangToaDoItem = KhachHangItem & {
  lat?: string | null;
  lng?: string | null;
};

/**
 * Ghi đè toạ độ mốc của khách hàng bằng GPS thiết bị (người đi hiện trường đứng
 * tại điểm bán).
 *
 * LAT/LNG là BẮT BUỘC ở API này — màn gọi phải có fix GPS rồi mới cho bấm lưu,
 * server từ chối toạ độ rỗng, ngoài [-90,90]/[-180,180] và đúng (0, 0).
 *
 * Toạ độ mới LUÔN ghi đè, không có ngưỡng chặn; mỗi lượt gọi sinh thêm 1 dòng
 * lịch sử nên màn gọi phải tự chặn double-submit. Đổi mốc chỉ ảnh hưởng các
 * lượt xác nhận vị trí tủ lạnh TỪ ĐÓ VỀ SAU.
 */
export const capNhatToaDoKhachHang = async ({
  idKhachHang,
  lat,
  lng,
}: {
  idKhachHang: number;
  lat: string;
  lng: string;
}) => {
  const response = await callApi<NoiDiaResponse<KhachHangToaDoItem>>(
    "POST",
    API_ENDPOINTS.NOI_DIA_KHACH_HANG_CAP_NHAT_TOA_DO,
    { ID_NoiDia_KhachHang: idKhachHang, LAT: lat, LNG: lng },
  );

  return {
    ...response,
    data: response.data ? withIdAliases(response.data) : null,
  };
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
