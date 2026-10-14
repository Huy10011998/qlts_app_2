/**
 * Kiểu dữ liệu của view Workflow: phiếu đề nghị chạy quy trình (Flow), công
 * việc (CV_CongViec) và kế hoạch (CV_KeHoach).
 *
 * Tên field theo camelCase kiểu .NET — chỉ hạ chữ cái ĐẦU: `ID_HoSo` thành
 * `iD_HoSo`, `ID_NhanVien_ChuTri` thành `iD_NhanVien_ChuTri`. Không phải gõ nhầm.
 */

// =====================================================
// DÙNG CHUNG
// =====================================================

/** Vỏ chung của mọi response: đọc payload ở `data`. */
export type WorkflowEnvelope<T> = {
  message?: string;
  data: T;
};

export type WorkflowListResult<T> = {
  items: T[];
  totalCount: number;
};

/**
 * Điều kiện lọc gửi lên server. `Operator` / `Type` là SỐ (SqlOperator /
 * TypeProperty) — gửi chữ "Equals" server trả 400.
 */
export type WorkflowCondition = {
  Property: string;
  Operator: number;
  Value: unknown;
  Type: number;
};

/** Kết quả chung của thao tác ghi: `loi` rỗng là thành công. */
export type FlowThaoTacResult = {
  soThanhCong: number;
  loi: string[] | null;
  /** Flow: số phiếu bị bỏ qua vì phải chọn người duyệt. */
  soCanChonNguoi?: number;
  /** CV chuyển trạng thái: ID các dòng lịch sử vừa ghi, để đẩy file kết quả. */
  iD_LichSus?: number[];
};

/** Kết quả của cv-them / cv-sua / kh-them / kh-sua / flow-tao-cong-viec. */
export type WorkflowSaveResult = {
  id: number;
  soLuong: number;
  loi: string | null;
};

export type WorkflowEmployee = {
  id: number;
  ma?: string | null;
  ten: string;
  phongBan?: string | null;
  chucVu?: string | null;
  chucDanh?: string | null;
};

export type WorkflowComment = {
  id: number;
  iD_NhanVien?: number | null;
  iD_NhanVien_MoTa?: string | null;
  noiDung?: string | null;
  ngayTao?: string | null;
  iD_File?: number | null;
  tenFile?: string | null;
  /** KB. */
  fileSize?: number | null;
};

export type WorkflowFileItem = {
  id: number;
  name: string;
  /** KB. */
  fileSize?: number | null;
  uploadedAt?: string | null;
  iD_User_MoTa?: string | null;
};

/** File người dùng vừa chọn, chưa tải lên. */
export type WorkflowPickedFile = {
  uri: string;
  name: string;
  type: string;
  /** Byte. Null khi hệ điều hành không báo. */
  size?: number | null;
};

/**
 * Gốc đường dẫn của nhóm API bình luận / file (`/api/{apiBase}/flow-*`): tên
 * bảng flow (vd `Ticket_PhongBan`) hoặc `CV_CongViec`.
 */
export type WorkflowApiBase = string;

/** Thông tin người đăng nhập dùng cho Workflow (POST /Common/get-info). */
export type WorkflowMe = {
  /** Null = tài khoản chưa liên kết nhân viên: chỉ xem. */
  iD_NhanVien: number | null;
  /** Phòng ban của tôi (get-nhan-vien-info) — điền ID_PhongBan_Tao khi lập phiếu. null = chưa khai. */
  iD_PhongBan: number | null;
};

// =====================================================
// FLOW — PHIẾU ĐỀ NGHỊ
// =====================================================

export type FlowTab =
  | "ChoDuyet"
  | "DangXuLy"
  | "HoanTat"
  | "Nhap"
  | "CuaToi"
  | "TatCa";

export type FlowInfo = {
  id: number;
  ten: string;
  tenBang: string;
  [key: string]: unknown;
};

export type FlowFieldsResult = {
  flow: FlowInfo;
  fields: Record<string, any>[];
};

/** Một phiếu: các field theo metadata + `<name>_MoTa`. */
export type FlowRecord = Record<string, any> & { id: number };

export type FlowThongTin = {
  iD_HoSo: number;
  soBinhLuan: number;
  soFile: number;
  /** 0 = nháp, chưa có quy trình. */
  soBuoc: number;
  isToiLuot: boolean;
  /** Bước con đang mở thì là tên bước cha; song song khác nhau nối ", ". */
  buocHienTai?: string | null;
  duocKhongYKien?: boolean;
  /** Bước đang chờ tôi có tick "Có thể trả bước" và có bước trước (mục 8d). */
  duocTraBuoc?: boolean;
  /** Bước sẽ mở lại nếu bấm Trả bước, vd "1. Trưởng bộ phận duyệt". */
  traVe?: string | null;
};

export type FlowBuoc = {
  id: number;
  buoc: number;
  buocCon: number | null;
  ten: string;
  tinhTrang: number;
  /** 0 tuần tự, 1 song song. */
  loaiXuLy?: number | null;
  ngayMo?: string | null;
  ngayHoanTat?: string | null;
};

export type FlowNguoiDuyet = {
  iD_Flow_HoSo_Buoc: number;
  iD_NhanVien?: number | null;
  iD_NhanVien_MoTa?: string | null;
  coCau_MoTa?: string | null;
  /** null chưa xử lý · 1 duyệt · 2 từ chối · 3 không ý kiến (4 trả bước chỉ ở nguoiDuyetCus). */
  ketQua: number | null;
  ngayDuyet?: string | null;
  yKien?: string | null;
  isChiXem?: boolean | null;
};

/** Một lần trả bước (traBuocs, theo `lan`). */
export type FlowTraBuoc = {
  lan: number;
  iD_Flow_HoSo_Buoc_Tu: number;
  iD_Flow_HoSo_Buoc_Ve: number;
  /** "3.2. Phòng Sản xuất" */
  tenBuocTu?: string | null;
  tenBuocVe?: string | null;
  iD_NhanVien?: number | null;
  iD_NhanVien_MoTa?: string | null;
  lyDo?: string | null;
  ngayTra?: string | null;
};

/**
 * Kết quả của lượt BỊ CHẠY LẠI (đã xoá khỏi nguoiDuyets khi trả), hiệu lực tới
 * lần trả `lan`. Có cả dòng ketQua 4 của người bấm trả.
 */
export type FlowNguoiDuyetCu = FlowNguoiDuyet & {
  iD_TraBuoc?: number | null;
  lan: number;
  tenBuoc?: string | null;
};

/** Người / nhóm khai cho bước chưa mở (luatNguois) — hiện mờ ở bước đó. */
export type FlowLuatNguoi = {
  iD_Flow_HoSo_Buoc: number;
  iD_NhanVien_MoTa?: string | null;
  nhanVien_CoCau_MoTa?: string | null;
  iD_PhongBan_MoTa?: string | null;
  iD_BoPhan_MoTa?: string | null;
  iD_ToDoi_MoTa?: string | null;
  iD_ChucVu_MoTa?: string | null;
  iD_ChucDanh_MoTa?: string | null;
  isChiXem?: boolean | null;
};

export type FlowCongViecLink = {
  iD_CongViec: number;
  iD_Flow_HoSo_Buoc: number;
  soCongViec?: string | null;
  tieuDe?: string | null;
  trangThai?: number | null;
  chuTri?: string | null;
  phoiHop?: string | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  ngayHoanThanh?: string | null;
  nguoiTao?: string | null;
  ngayTao?: string | null;
};

export type FlowTienTrinh = {
  buocs: FlowBuoc[];
  nguoiDuyets: FlowNguoiDuyet[];
  luatNguois?: FlowLuatNguoi[];
  congViec: FlowCongViecLink | null;
  traBuocs?: FlowTraBuoc[];
  nguoiDuyetCus?: FlowNguoiDuyetCu[];
};

export type FlowChonNguoiBuoc = {
  iD_Buoc: number;
  soBuoc?: number | null;
  ten: string;
  /** true: chỉ được chọn trong `ungViens` của bước. */
  coLuat?: boolean;
};

export type FlowChonNguoiPair = {
  iD_Buoc: number;
  iD_NhanVien: number;
};

/** Dữ liệu điền sẵn form công việc ở lượt duyệt cuối (mục 9). */
export type FlowTaoCongViecPrefill = {
  tieuDe?: string | null;
  moTa?: string | null;
  iD_LoaiCongViec?: number | null;
  /** Số phiếu — dòng đầu mô tả "Giao công việc từ phiếu {soPhieu}". */
  soPhieu?: string | null;
  [key: string]: unknown;
};

export type FlowChonNguoi = {
  buocs: FlowChonNguoiBuoc[];
  ungViens: FlowChonNguoiPair[];
  daChons: FlowChonNguoiPair[];
  nhanViens: WorkflowEmployee[];
  /** Chỉ có ở flow-chon-nguoi-duyet. */
  taoCongViec?: FlowTaoCongViecPrefill | null;
};

export type FlowDuyetPayload = {
  IDs: number[];
  /** 1 Duyệt · 2 Từ chối · 3 Không ý kiến · 4 Trả bước (YKien = lý do, bắt buộc). */
  KetQua: number;
  YKien?: string | null;
  Chons?: Array<{ ID_Buoc: number; ID_NhanVien: number }>;
};

// =====================================================
// CÔNG VIỆC
// =====================================================

export type CongViecTab =
  | "DenHan"
  | "MoiHomNay"
  | "QuaHan"
  | "GiaHan"
  | "ChuaXong"
  | "TatCa"
  | "DaHuy"
  /** Tab đặc biệt: công việc của một kế hoạch (kèm điều kiện ID_KeHoach). */
  | "KeHoach"
  /** Tab đặc biệt của màn lịch: mọi việc trừ Hủy. */
  | "Lich";

export type CongViecMaMau =
  | "QuaHan"
  | "GiaHan"
  | "DangXuLy"
  | "Moi"
  | "HoanThanh"
  | "Huy";

export type CongViecItem = {
  id: number;
  soCongViec?: string | null;
  tieuDe?: string | null;
  moTa?: string | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  hanBanDau?: string | null;
  trangThai: number;
  ngayHoanThanh?: string | null;
  mucDoKhan?: number | null;
  mucDoQuanTrong?: number | null;
  iD_LoaiCongViec?: number | null;
  iD_LoaiCongViec_MoTa?: string | null;
  mauLoai?: string | null;
  iD_KeHoach?: number | null;
  iD_KeHoach_MoTa?: string | null;
  iD_NhanVien_ChuTri?: number | null;
  chuTri_MoTa?: string | null;
  iD_NhanVien_Tao?: number | null;
  iD_NhanVien_Tao_MoTa?: string | null;
  ngayTao?: string | null;
  iD_DinhKy?: number | null;
  lanLap?: number | null;
  maMau?: CongViecMaMau | string | null;
  /**
   * Ô "Không được chuyển người chủ trì" (null = false). Sửa phải gửi lại đúng
   * giá trị này — chỉ người tạo đổi được, người khác gửi gì server cũng giữ cũ.
   */
  isKhongChuyenChuTri?: boolean | null;
  [key: string]: any;
};

export type CongViecQuyen = {
  /** 1 Chủ trì · 2 Phối hợp · 3 Để biết · null. */
  vaiTro: number | null;
  isNguoiTao: boolean;
  duocTraoDoi: boolean;
  duocQuanLy: boolean;
  duocChuyenTrangThai: boolean;
  duocDoiChuTri: boolean;
  /** Việc sinh từ phiếu đề nghị — không xoá được, muốn bỏ thì Hủy. */
  isTuPhieu?: boolean;
  /** Server đã tính sẵn: người tạo + còn Mới + không từ phiếu. */
  duocXoa?: boolean;
};

export type CongViecThongTin = Partial<CongViecQuyen> & {
  id: number;
  soBinhLuan: number;
  soFile: number;
};

export type CongViecThamGia = {
  iD_NhanVien: number;
  vaiTro: number;
  ma?: string | null;
  ten: string;
  phongBan?: string | null;
  chucVu?: string | null;
  chucDanh?: string | null;
};

export type CongViecDinhKy = {
  kieuLap: number;
  moiN: number;
  thuTrongTuan?: string | null;
  ngayBatDau?: string | null;
  ketThucNgay?: string | null;
  soLan?: number | null;
  soLanDaSinh?: number | null;
  lanLap?: number | null;
};

export type CongViecChiTiet = {
  congViec: CongViecItem;
  quyen: CongViecQuyen;
  thamGias: CongViecThamGia[];
  dinhKy: CongViecDinhKy | null;
};

export type CongViecLichSu = {
  id: number;
  /** 1 Tạo · 2 Chuyển trạng thái · 3 Gia hạn · 4 Đổi chủ trì · 5 Cập nhật tham gia. */
  loai: number;
  trangThaiCu?: number | null;
  trangThaiMoi?: number | null;
  denNgayCu?: string | null;
  denNgayMoi?: string | null;
  nguoiCu?: string | null;
  nguoiMoi?: string | null;
  ghiChu?: string | null;
  nguoiThaoTac?: string | null;
  ngayTao?: string | null;
  files?: WorkflowFileItem[] | null;
};

export type CongViecThamGiaPayload = {
  ID_NhanVien: number;
  VaiTro: number;
};

export type CongViecDinhKyPayload = {
  KieuLap: number;
  MoiN: number;
  ThuTrongTuan: string | null;
  NgayBatDau: string;
  KetThucNgay: string | null;
  SoLan: number | null;
};

/** Body của cv-them / cv-sua — đúng các khoá server nhận, không động. */
export type CongViecSavePayload = {
  ID: number;
  TieuDe: string;
  MoTa: string | null;
  ID_LoaiCongViec: number | null;
  ID_KeHoach: number | null;
  MucDoKhan: number;
  MucDoQuanTrong: number;
  TuNgay: string;
  DenNgay: string;
  IsKhongChuyenChuTri: boolean;
  ThamGias: CongViecThamGiaPayload[];
  DinhKy: CongViecDinhKyPayload | null;
};

/** Loại thông báo của cv-thong-bao. */
/** cv-dashboard (4-Mobile-CongViec mục 10): tổng quan công việc của tôi. */
export type CongViecDashboard = {
  tongQuan: {
    /** % việc đã hoàn tất trong năm. */
    phanTramHoanTatNam?: number | null;
    soThangNay?: number | null;
    soThangTruoc?: number | null;
    quaHan?: number | null;
    chuaDenHan?: number | null;
    hoanTatTreHan?: number | null;
    hoanTatDungHan?: number | null;
  } | null;
  /** 6 tháng gần nhất, cũ → mới. `nhan` ("10/26") BE trả kèm, có thể thiếu. */
  sauThang: Array<{
    nam: number;
    thang: number;
    soViec?: number | null;
    soHoanThanh?: number | null;
    nhan?: string | null;
  }> | null;
};

export type WorkflowThongBaoLoai = "Flow" | "Giao" | "SapHan" | "QuaHan" | "BinhLuan";

export type WorkflowThongBao = {
  loai: WorkflowThongBaoLoai | string;
  tieuDe?: string | null;
  noiDung?: string | null;
  thoiGian?: string | null;
  /** Có thì bấm mở chi tiết công việc. */
  iD_CongViec?: number | null;
  /** Loại Flow: tên bảng của màn phiếu đề nghị (vd "Ticket_PhongBan"). */
  tenBang?: string | null;
  /** Loại Flow: ID phiếu khi ĐÚNG 1 phiếu chờ; null = nhiều phiếu → mở tab Chờ duyệt. */
  iD_HoSo?: number | null;
};

/** Nhóm của thông báo chuông (8-Mobile-ThongBao). */
export type ThongBaoNhom = "Flow" | "CongViec" | "KeHoach";

/** 1 thông báo chuông (thong-bao-get-list / sự kiện hub "ThongBaoMoi"). */
export type ThongBaoItem = {
  id: number;
  nhom: ThongBaoNhom | string;
  loai: string;
  tieuDe?: string | null;
  noiDung?: string | null;
  /** "CV_CongViec" / "CV_KeHoach" / tên bảng phiếu (vd "Ticket_PhongBan"). */
  tenBang?: string | null;
  iD_DoiTuong?: number | null;
  iD_NhanVien_Gui?: number | null;
  /** null = hệ thống (vd nhắc hạn). */
  nguoiGui?: string | null;
  ngayTao?: string | null;
  daDoc?: boolean | null;
};

export type ThongBaoListResult = {
  items: ThongBaoItem[];
  /** Theo bộ lọc — để phân trang. */
  totalCount: number;
  /** Số chưa đọc của MỌI nhóm (số trên chuông), không theo bộ lọc. */
  soChuaDoc: number;
};

// =====================================================
// KẾ HOẠCH
// =====================================================

export type KeHoachTab = "TatCa" | "ChuTri" | "ThamGia";

export type KeHoachItem = {
  id: number;
  soKeHoach?: string | null;
  tieuDe?: string | null;
  moTa?: string | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  /** = chủ trì. */
  iD_NhanVien_Tao?: number | null;
  chuTri_MoTa?: string | null;
  ngayTao?: string | null;
  soThamGia?: number | null;
  soCongViec?: number | null;
  soHoanThanh?: number | null;
  soHuy?: number | null;
  /** null = chưa có việc (hoặc toàn việc Hủy). */
  phanTram?: number | null;
  [key: string]: any;
};

export type KeHoachChiTiet = {
  keHoach: KeHoachItem;
  quyen: { id: number; isChuTri: boolean; duocXem: boolean };
  /** KHÔNG gồm chủ trì. */
  thamGias: WorkflowEmployee[];
};

export type KeHoachSavePayload = {
  ID: number;
  TieuDe: string;
  MoTa: string | null;
  TuNgay: string;
  DenNgay: string;
  /** ID nhân viên — ghi đè danh sách cũ. */
  ThamGias: number[];
};

// =====================================================
// THAM SỐ ROUTE
// =====================================================

/**
 * Form công việc. Ngoài thêm / sửa còn mở từ: lịch (ngày đã chọn), kế hoạch
 * (điền sẵn kế hoạch), và lượt duyệt cuối của phiếu ("Tạo công việc").
 */
export type CongViecFormParams = {
  mode: "add" | "edit";
  /** Sửa: ID công việc. */
  id?: number;
  /** Thêm từ lịch: ngày chọn, "yyyy-MM-dd" — Từ 08:00, Đến 17:00. */
  ngay?: string;
  /** Thêm từ kế hoạch. */
  keHoach?: { id: number; text?: string | null };
  /**
   * Nhân bản (4-Mobile-CongViec mục 4b): thêm mới, chép từ cv-chi-tiet của việc
   * này — trừ số, trạng thái, lịch sử, bình luận, file, định kỳ cũ.
   */
  cloneId?: number;
  /** Tạo công việc ở lượt duyệt cuối của phiếu đề nghị. */
  fromFlow?: {
    nameClass: string;
    idHoSo: number;
    yKien: string | null;
    soPhieu?: string | null;
    prefill?: FlowTaoCongViecPrefill | null;
  };
};

export type FlowFormParams = {
  nameClass: string;
  mode: "add" | "edit" | "clone";
  /** Sửa nháp / nhân bản: dòng phiếu đang có. */
  item?: FlowRecord;
};

export type WorkflowCommentsParams = {
  apiBase: WorkflowApiBase;
  idHoSo: number;
  titleHeader?: string;
  /** Được gửi bình luận (CV: quyen.duocTraoDoi; phiếu: ai xem được là gửi được). */
  canSend: boolean;
};

export type WorkflowFilesParams = {
  apiBase: WorkflowApiBase;
  idHoSo: number;
  titleHeader?: string;
  /** Được thêm / xoá file. */
  canEdit: boolean;
};
