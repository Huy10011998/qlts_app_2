import type {
  CongViecMaMau,
  CongViecTab,
  FlowTab,
  KeHoachTab,
} from "../../../types/index";

/**
 * Mã số + nhãn + màu của view Workflow, chép từ PHỤ LỤC các tài liệu BE
 * (3-Mobile-PhieuDeNghi-Flow, 4-Mobile-CongViec, 5-Mobile-KeHoach).
 */

export type WorkflowOption = {
  value: number;
  label: string;
  color: string;
  /**
   * Chữ khi màu nhãn quá nhạt để đọc: trên nền đặc thay cho chữ trắng, trên nền
   * nhạt / nền thẻ thay cho chính `color`.
   */
  textColor?: string;
};

export type WorkflowTabDef<K extends string> = {
  key: K;
  label: string;
  /** Server có trả số cho tab này (dem-tab). */
  counted?: boolean;
};

/** Nền nhạt cho nhãn màu: thêm kênh alpha vào mã #RRGGBB. */
export const tint = (hex: string, alpha = "1F") =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;

const findOption = (options: WorkflowOption[], value: unknown) =>
  options.find((option) => option.value === Number(value));

// =====================================================
// FLOW
// =====================================================

/**
 * Tình trạng PHIẾU — nhãn nền đặc, CHỮ TRẮNG, cùng bảng màu màn Công việc
 * (web: TinhTrangFlowMau). Riêng nền cam / xám nhạt chữ trắng không đọc được
 * (dưới 3:1) nên dùng chữ tối.
 */
export const FLOW_TINH_TRANG: WorkflowOption[] = [
  { value: 0, label: "Nháp", color: "#78909c" },
  { value: 1, label: "Chờ duyệt", color: "#fb8c00", textColor: "#3e2723" },
  { value: 2, label: "Đang xử lý", color: "#1e88e5" },
  { value: 3, label: "Đã hoàn tất", color: "#43a047" },
  { value: 4, label: "Đã từ chối", color: "#e53935" },
  { value: 5, label: "Đã hủy", color: "#bdbdbd", textColor: "#424242" },
];

export const FLOW_TINH_TRANG_NHAP = 0;
export const FLOW_TINH_TRANG_HOAN_TAT = 3;

/** Tình trạng BƯỚC — nhãn nền đặc trên sơ đồ, chữ trắng (trừ Chờ xử lý: chữ tối). */
export const FLOW_BUOC_TINH_TRANG: WorkflowOption[] = [
  { value: 0, label: "Chờ xử lý", color: "#c8ced3", textColor: "#4f5d73" },
  { value: 1, label: "Đang xử lý", color: "#e55353" },
  { value: 2, label: "Đã duyệt", color: "#2eb85c" },
  { value: 3, label: "Đã từ chối", color: "#5c6873" },
  { value: 4, label: "Không ý kiến", color: "#9da5b1" },
];

export const FLOW_BUOC_CHO_XU_LY = 0;
export const FLOW_BUOC_DANG_XU_LY = 1;
/** Không ý kiến, hoặc Bỏ qua khi không ai bấm Không ý kiến. */
export const FLOW_BUOC_KHONG_Y_KIEN = 4;

export const FLOW_KET_QUA = {
  Duyet: 1,
  TuChoi: 2,
  KhongYKien: 3,
  /** Chỉ từng phiếu, YKien = lý do bắt buộc (mục 8d). */
  TraBuoc: 4,
} as const;

export const FLOW_KET_QUA_LABEL: Record<number, string> = {
  1: "Duyệt",
  2: "Từ chối",
  3: "Không ý kiến",
  4: "Trả bước",
};

/** Màu cam của Trả bước: nút, nét đứt trên sơ đồ, dòng lịch sử. */
export const FLOW_TRA_BUOC_COLOR = "#f9a825";

/** Người duyệt chưa bấm gì (ketQua null). */
export const FLOW_KET_QUA_CHO_XU_LY = "Chờ xử lý";

export const FLOW_TABS: WorkflowTabDef<FlowTab>[] = [
  { key: "ChoDuyet", label: "Chờ duyệt", counted: true },
  { key: "DangXuLy", label: "Đang xử lý", counted: true },
  { key: "HoanTat", label: "Đã hoàn tất" },
  { key: "Nhap", label: "Nháp", counted: true },
  { key: "CuaToi", label: "Hồ sơ của tôi" },
  { key: "TatCa", label: "Tất cả" },
];

export const getFlowTinhTrang = (value: unknown) =>
  findOption(FLOW_TINH_TRANG, value);

export const getFlowBuocTinhTrang = (value: unknown) =>
  findOption(FLOW_BUOC_TINH_TRANG, value) ?? FLOW_BUOC_TINH_TRANG[0];

// =====================================================
// CÔNG VIỆC
// =====================================================

// "Hủy" giữ màu xám nhạt của web cho vạch / chấm màu; chữ xám nhạt trên nền
// trắng không đọc được nên chữ (và nút đang chọn) dùng `textColor` đậm hơn.
export const CV_TRANG_THAI: WorkflowOption[] = [
  { value: 0, label: "Mới", color: "#78909c" },
  { value: 1, label: "Đang xử lý", color: "#1e88e5" },
  { value: 2, label: "Hoàn thành", color: "#43a047" },
  { value: 3, label: "Hủy", color: "#bdbdbd", textColor: "#616161" },
];

export const CV_TRANG_THAI_MOI = 0;
export const CV_TRANG_THAI_DANG_XU_LY = 1;
export const CV_TRANG_THAI_HUY = 3;

/** "Chưa xong" = Mới / Đang xử lý. */
export const isCongViecChuaXong = (trangThai: unknown) =>
  Number(trangThai) === CV_TRANG_THAI_MOI ||
  Number(trangThai) === CV_TRANG_THAI_DANG_XU_LY;

export const getCongViecTrangThai = (value: unknown) =>
  findOption(CV_TRANG_THAI, value);

/**
 * Màu tính sẵn ở server (maMau) — KHÔNG phải trạng thái lưu. Thứ tự đúng thứ
 * tự ưu tiên của server; chip lọc màu hiện theo thứ tự này.
 */
export const CV_MA_MAU: Array<{
  key: CongViecMaMau;
  label: string;
  color: string;
  /** Chữ khi `color` quá nhạt để đọc trên nền sáng (Hủy). */
  textColor?: string;
}> = [
  { key: "QuaHan", label: "Quá hạn", color: "#e53935" },
  { key: "GiaHan", label: "Gia hạn", color: "#fb8c00" },
  { key: "DangXuLy", label: "Đang xử lý", color: "#1e88e5" },
  { key: "Moi", label: "Mới", color: "#78909c" },
  { key: "HoanThanh", label: "Hoàn thành", color: "#43a047" },
  { key: "Huy", label: "Hủy", color: "#bdbdbd", textColor: "#616161" },
];

export const getMaMauColor = (maMau: unknown) =>
  CV_MA_MAU.find((item) => item.key === maMau)?.color ?? "#78909c";

/**
 * Thứ tự hiển thị: "Chưa xong" đứng đầu vì là tab mặc định (web cũng mở tab
 * này), khỏi phải cuộn mới thấy tab đang chọn.
 */
export const CV_TABS: WorkflowTabDef<CongViecTab>[] = [
  { key: "ChuaXong", label: "Chưa xong", counted: true },
  { key: "DenHan", label: "Đến hạn", counted: true },
  { key: "QuaHan", label: "Quá hạn", counted: true },
  { key: "GiaHan", label: "Gia hạn", counted: true },
  { key: "MoiHomNay", label: "Mới hôm nay", counted: true },
  { key: "TatCa", label: "Tất cả" },
  { key: "DaHuy", label: "Đã hủy" },
];

export const CV_VAI_TRO = {
  ChuTri: 1,
  PhoiHop: 2,
  DeBiet: 3,
} as const;

export const CV_VAI_TRO_OPTIONS = [
  { value: 1, label: "Chủ trì" },
  { value: 2, label: "Phối hợp" },
  { value: 3, label: "Để biết" },
];

export const getVaiTroLabel = (value: unknown) =>
  CV_VAI_TRO_OPTIONS.find((item) => item.value === Number(value))?.label ?? "";

export const CV_MUC_DO_KHAN = [
  { value: 0, label: "Thường" },
  { value: 1, label: "Khẩn" },
];

export const CV_MUC_DO_QUAN_TRONG = [
  { value: 0, label: "Thường" },
  { value: 1, label: "Quan trọng" },
];

export const CV_KIEU_LAP = [
  { value: 1, label: "Ngày", unit: "ngày" },
  { value: 2, label: "Tuần", unit: "tuần" },
  { value: 3, label: "Tháng", unit: "tháng" },
  { value: 4, label: "Năm", unit: "năm" },
];

export const CV_KIEU_LAP_TUAN = 2;

/** Thứ trong tuần của định kỳ kiểu tuần: T2 = 2 ... CN = 8. */
export const CV_THU_TRONG_TUAN = [
  { value: 2, label: "T2" },
  { value: 3, label: "T3" },
  { value: 4, label: "T4" },
  { value: 5, label: "T5" },
  { value: 6, label: "T6" },
  { value: 7, label: "T7" },
  { value: 8, label: "CN" },
];

/** Tối đa số lần định kỳ server sinh. */
export const CV_DINH_KY_MAX_LAN = 366;

export const CV_LICH_SU_LOAI: Record<number, string> = {
  1: "Tạo mới",
  2: "Chuyển trạng thái",
  3: "Gia hạn",
  4: "Đổi chủ trì",
  5: "Cập nhật người tham gia",
};

// =====================================================
// KẾ HOẠCH
// =====================================================

export const KH_TABS: WorkflowTabDef<KeHoachTab>[] = [
  { key: "TatCa", label: "Tất cả" },
  { key: "ChuTri", label: "Tôi chủ trì" },
  { key: "ThamGia", label: "Tôi tham gia" },
];

export const KH_PROGRESS_COLOR = "#43a047";
export const KH_PROGRESS_DONE_COLOR = "#2e7d32";
export const KH_PROGRESS_TRACK_COLOR = "#e4e7ea";
/** Vòng nền tối: #e4e7ea trên thẻ tối sáng chói, lấn cả phần đã hoàn thành. */
export const KH_PROGRESS_TRACK_COLOR_DARK = "#33455b";

// =====================================================
// DÙNG CHUNG
// =====================================================

/**
 * Đọc số trên tab. Server trả key PascalCase ("ChoDuyet") khác phần còn lại
 * của response, nên tra không phân biệt hoa thường.
 */
export const readTabCount = (
  counts: Record<string, number> | null | undefined,
  key: string,
) => {
  if (!counts) return undefined;

  const matched = Object.keys(counts).find(
    (item) => item.toLowerCase() === key.toLowerCase(),
  );
  const value = matched ? Number(counts[matched]) : NaN;

  return Number.isFinite(value) ? value : undefined;
};
