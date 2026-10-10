import type {
  CongViecItem,
  CongViecQuyen,
  CongViecSavePayload,
  CongViecThamGiaPayload,
} from "../../../types/index";
import { CV_VAI_TRO, isCongViecChuaXong } from "../shared/workflowConstants";

/**
 * Luật ẩn / hiện của màn Công việc (mục 3, 4-Mobile-CongViec). Luật thật ở
 * server — đây chỉ đọc cờ quyền server trả về, KHÔNG tự suy quyền.
 */

/** Vẽ riêng ở thẻ / chi tiết: nhãn trạng thái. */
export const CV_CARD_CUSTOM_FIELDS = ["TrangThai"] as const;

/** Vẽ riêng ở form: ngày + giờ tách đôi, trạng thái chỉ đổi qua Chuyển trạng thái. */
export const CV_FORM_CUSTOM_FIELDS = ["TuNgay", "DenNgay", "TrangThai"] as const;

/**
 * Khoá động mà cv-them / cv-sua nhận. Field mới thêm vào bảng chỉ hiện ở thẻ /
 * chi tiết, không hiện trên form vì gửi lên server cũng bỏ qua.
 */
export const CV_DYNAMIC_SAVE_KEYS = [
  "TieuDe",
  "MoTa",
  "ID_LoaiCongViec",
  "ID_KeHoach",
  "MucDoKhan",
  "MucDoQuanTrong",
] as const;

export type CongViecActions = {
  sua: boolean;
  chuyenTrangThai: boolean;
  giaHan: boolean;
  doiChuTri: boolean;
  xoa: boolean;
  /** Ô gửi bình luận, thêm / xoá file. */
  traoDoi: boolean;
};

const NO_ACTIONS: CongViecActions = {
  sua: false,
  chuyenTrangThai: false,
  giaHan: false,
  doiChuTri: false,
  xoa: false,
  traoDoi: false,
};

/**
 * Nút theo cờ quyền. Tất cả false mà vẫn mở được = người CHỈ XEM (chủ trì kế
 * hoạch chứa việc, người thấy phiếu đã sinh ra việc).
 *
 * Xoá đọc thẳng cờ `duocXoa` server đã tính (người tạo + còn Mới + không sinh
 * từ phiếu), kèm quyền Class.CV_CongViec.Delete — app không tự suy.
 */
export const getCongViecActions = (
  congViec: Pick<CongViecItem, "trangThai"> | null | undefined,
  quyen: Partial<CongViecQuyen> | null | undefined,
  perms: { canUpdate: boolean; canDelete: boolean },
): CongViecActions => {
  if (!congViec || !quyen) return NO_ACTIONS;

  const chuaXong = isCongViecChuaXong(congViec.trangThai);

  return {
    sua: !!quyen.duocQuanLy && chuaXong && perms.canUpdate,
    chuyenTrangThai: !!quyen.duocChuyenTrangThai,
    giaHan: !!quyen.duocQuanLy && chuaXong,
    doiChuTri: !!quyen.duocDoiChuTri && chuaXong,
    xoa: !!quyen.duocXoa && perms.canDelete,
    traoDoi: !!quyen.duocTraoDoi,
  };
};

/** Lỗi của danh sách người tham gia, null = hợp lệ. */
export const validateThamGias = (thamGias: CongViecThamGiaPayload[]) => {
  const chuTris = thamGias.filter((item) => item.VaiTro === CV_VAI_TRO.ChuTri);
  if (chuTris.length !== 1) return "Công việc phải có đúng 1 người Chủ trì.";

  const ids = thamGias.map((item) => item.ID_NhanVien);
  if (new Set(ids).size !== ids.length) {
    return "Mỗi người chỉ giữ một vai trò.";
  }

  return null;
};

/** Lỗi của khoảng thời gian, null = hợp lệ. */
export const validateTuDen = (tuNgay: Date | null, denNgay: Date | null) => {
  if (!tuNgay) return "Vui lòng chọn Từ ngày.";
  if (!denNgay) return "Vui lòng chọn Đến ngày.";
  if (denNgay.getTime() < tuNgay.getTime()) {
    return "Đến ngày phải sau hoặc bằng Từ ngày.";
  }
  return null;
};

/** Lỗi của định kỳ, null = hợp lệ. */
export const validateDinhKy = (dinhKy: CongViecSavePayload["DinhKy"]) => {
  if (!dinhKy) return null;
  if (!dinhKy.MoiN || dinhKy.MoiN < 1) return "Số lần lặp (mỗi N) phải từ 1 trở lên.";
  if (dinhKy.KieuLap === 2 && !dinhKy.ThuTrongTuan) {
    return "Vui lòng chọn thứ trong tuần cho định kỳ theo tuần.";
  }
  if (!dinhKy.NgayBatDau) return "Vui lòng chọn ngày bắt đầu định kỳ.";

  const hasEnd = !!dinhKy.KetThucNgay;
  const hasCount = dinhKy.SoLan != null;
  if (hasEnd === hasCount) return "Chọn đúng một cách kết thúc: theo ngày hoặc theo số lần.";
  if (hasCount && (dinhKy.SoLan! < 1 || dinhKy.SoLan! > 366)) {
    return "Số lần lặp từ 1 đến 366.";
  }

  return null;
};
