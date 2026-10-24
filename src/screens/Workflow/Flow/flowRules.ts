import type {
  FlowBuoc,
  FlowChonNguoi,
  FlowChonNguoiPair,
  FlowNguoiDuyet,
  FlowRecord,
  FlowThongTin,
  FlowTienTrinh,
} from "../../../types/index";
import {
  FLOW_BUOC_CHO_XU_LY,
  FLOW_BUOC_DANG_XU_LY,
  FLOW_BUOC_KHONG_Y_KIEN,
  FLOW_KET_QUA,
  FLOW_KET_QUA_CHO_XU_LY,
  FLOW_KET_QUA_LABEL,
  FLOW_TINH_TRANG_HOAN_TAT,
  FLOW_TRA_BUOC_COLOR,
  FLOW_TINH_TRANG_NHAP,
} from "../shared/workflowConstants";
import { parseBeDate } from "../shared/workflowDate";
import { readItemValue } from "../shared/workflowFields";

/**
 * Luật màn phiếu đề nghị (3-Mobile-PhieuDeNghi-Flow). Luật thật ở server —
 * đây chỉ ẩn / hiện nút.
 *
 * Field hệ thống: mọi bảng nghiệp vụ flow đều có, cùng tên, được ghi cứng ở app
 * (mục 3). Cột SỐ PHIẾU khác tên giữa các flow nên app không biết tên.
 */
export const FLOW_FIELD = {
  ID: "ID",
  ID_Flow: "ID_Flow",
  ID_LoaiFlow: "ID_LoaiFlow",
  TinhTrang: "TinhTrang",
  NgayTao: "NgayTao",
  ID_NhanVien_Tao: "ID_NhanVien_Tao",
  ID_PhongBan_Tao: "ID_PhongBan_Tao",
} as const;

/** Vẽ riêng ở thẻ / chi tiết: nhãn tình trạng tô màu. */
export const FLOW_CARD_CUSTOM_FIELDS = [FLOW_FIELD.TinhTrang] as const;

/**
 * Field hệ thống app tự điền khi thêm — không cho sửa (metadata vốn để chỉ
 * đọc; loại thêm ở đây phòng khi metadata khai thiếu). ID_LoaiFlow KHÔNG nằm
 * trong đây: người lập chọn loại đề nghị.
 */
export const FLOW_FORM_SYSTEM_FIELDS = [
  FLOW_FIELD.ID,
  FLOW_FIELD.ID_Flow,
  FLOW_FIELD.TinhTrang,
  FLOW_FIELD.NgayTao,
  FLOW_FIELD.ID_NhanVien_Tao,
  FLOW_FIELD.ID_PhongBan_Tao,
] as const;

export type FlowPermissions = {
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export type FlowActions = {
  sua: boolean;
  xoa: boolean;
  /** Duyệt và Từ chối luôn đi cùng nhau. */
  duyet: boolean;
  khongYKien: boolean;
  /** Nút cam, đứng trước Từ chối; chỉ làm từng phiếu (mục 8d). */
  traBuoc: boolean;
  nhanBan: boolean;
  quyTrinh: boolean;
  /** Mở danh sách file (tắt khi 0 file, trừ nháp của tôi còn thêm được). */
  dinhKem: boolean;
  /** Thêm / xoá file: chỉ nháp của người lập. */
  suaFile: boolean;
};

export const getFlowTinhTrang = (record: FlowRecord | null | undefined) =>
  Number(readItemValue(record, FLOW_FIELD.TinhTrang) ?? FLOW_TINH_TRANG_NHAP);

export const isFlowOwner = (record: FlowRecord | null | undefined, idNhanVien: number | null) =>
  !!idNhanVien && Number(readItemValue(record, FLOW_FIELD.ID_NhanVien_Tao)) === idNhanVien;

/** Mục 4: nút trên mỗi phiếu theo quyền + tình trạng + flow-thong-tin. */
export const getFlowActions = (
  record: FlowRecord | null | undefined,
  info: FlowThongTin | null | undefined,
  idNhanVien: number | null,
  perms: FlowPermissions,
): FlowActions => {
  const tinhTrang = getFlowTinhTrang(record);
  const isOwner = isFlowOwner(record, idNhanVien);
  const isNhap = tinhTrang === FLOW_TINH_TRANG_NHAP;
  const linked = !!idNhanVien;
  const suaFile = isNhap && isOwner;

  return {
    sua: perms.canUpdate && isNhap && isOwner,
    xoa: perms.canDelete && isOwner && tinhTrang !== FLOW_TINH_TRANG_HOAN_TAT,
    duyet: linked && !!info?.isToiLuot,
    khongYKien: linked && !!info?.isToiLuot && !!info?.duocKhongYKien,
    traBuoc: linked && !!info?.isToiLuot && !!info?.duocTraBuoc,
    nhanBan: perms.canInsert && linked,
    quyTrinh: (info?.soBuoc ?? 0) > 0,
    dinhKem: (info?.soFile ?? 0) > 0 || suaFile,
    suaFile,
  };
};

export type FlowApproveButton = {
  key: "traBuoc" | "tuChoi" | "khongYKien" | "duyet";
  /** Biến thể màu của `WorkflowButton`. */
  variant: "warning" | "danger" | "muted" | "success";
  icon: string;
  label: string;
  ketQua: (typeof FLOW_KET_QUA)[keyof typeof FLOW_KET_QUA];
};

/**
 * Nút duyệt của phiếu tới lượt tôi, đúng thứ tự mục 4: Trả bước (cam) · Từ chối
 * · Không ý kiến · Duyệt. Chung cho thanh nút màn chi tiết và nút vuốt thẻ ở
 * danh sách. Không tới lượt thì rỗng.
 */
export const getFlowApproveButtons = (actions: FlowActions): FlowApproveButton[] => {
  if (!actions.duyet) return [];
  const buttons: (FlowApproveButton | null)[] = [
    actions.traBuoc
      ? { key: "traBuoc", variant: "warning", icon: "arrow-undo-outline", label: "Trả bước", ketQua: FLOW_KET_QUA.TraBuoc }
      : null,
    { key: "tuChoi", variant: "danger", icon: "close-circle-outline", label: "Từ chối", ketQua: FLOW_KET_QUA.TuChoi },
    actions.khongYKien
      ? { key: "khongYKien", variant: "muted", icon: "remove-circle-outline", label: "Không ý kiến", ketQua: FLOW_KET_QUA.KhongYKien }
      : null,
    { key: "duyet", variant: "success", icon: "checkmark-circle-outline", label: "Duyệt", ketQua: FLOW_KET_QUA.Duyet },
  ];
  return buttons.filter((button): button is FlowApproveButton => !!button);
};

/**
 * Tình trạng vẽ lên sơ đồ của một bước. Bước cha có bước con (duyệt song song)
 * giữ tinhTrang = Chờ xử lý trên server cho tới khi hoàn tất, dù bước con đã mở —
 * web vẽ bước đó là đang xử lý. Có bước con đã mở thì bước cha là Đang xử lý;
 * còn lại giữ đúng số server trả.
 */
export const getFlowBuocTinhTrangHienThi = (
  buoc: Pick<FlowBuoc, "tinhTrang">,
  children: Pick<FlowBuoc, "tinhTrang">[],
) =>
  buoc.tinhTrang === FLOW_BUOC_CHO_XU_LY &&
  children.some((child) => child.tinhTrang !== FLOW_BUOC_CHO_XU_LY)
    ? FLOW_BUOC_DANG_XU_LY
    : buoc.tinhTrang;

/** Màu chấm tab Lịch sử: Duyệt / Tạo công việc xanh, Từ chối đỏ, Trả bước cam, còn lại xám. */
export const FLOW_HISTORY_COLOR = {
  ThemMoi: "#1e88e5",
  Duyet: "#2eb85c",
  TuChoi: "#e55353",
  TraBuoc: FLOW_TRA_BUOC_COLOR,
  Khac: "#9da5b1",
};

/** Một dòng tab Lịch sử (PHỤ LỤC): tiêu đề + nội dung + người, ý kiến / lý do. */
export type FlowHistoryEvent = {
  time: Date;
  title: string;
  content?: string;
  by?: string;
  /** Người ở dòng là chính người đăng nhập — tên in đậm. */
  byMe?: boolean;
  note?: string;
  /** "Ý kiến" — Trả bước ghi "Lý do". */
  noteLabel?: string;
  color: string;
};

const tenNguoi = (nguoi: FlowNguoiDuyet) => nguoi.iD_NhanVien_MoTa ?? nguoi.coCau_MoTa ?? "";

/** "3.2. Phòng Sản xuất" — cùng kiểu tên bước BE trả trong traBuocs / nguoiDuyetCus. */
export const formatFlowBuocTen = (buoc: Pick<FlowBuoc, "buoc" | "buocCon" | "ten">) =>
  `${buoc.buoc}${buoc.buocCon != null ? `.${buoc.buocCon}` : ""}. ${buoc.ten}`;

/**
 * Tab Lịch sử theo thời gian, đúng tiêu đề web (PHỤ LỤC): Thêm mới · Chờ xử lý
 * (bước mở, giao ai / ai chỉ xem) · Duyệt / Từ chối / Không ý kiến (cả kết quả
 * của lượt bị chạy lại — nguoiDuyetCus) · Bỏ qua (bước 4 không ai bấm) · Trả
 * bước · Tạo công việc.
 */
export const getFlowHistory = (
  data:
    | Pick<FlowTienTrinh, "buocs" | "nguoiDuyets" | "congViec" | "traBuocs" | "nguoiDuyetCus">
    | null
    | undefined,
  ngayLap: unknown,
  nguoiLap: unknown,
  /** So tên in đậm: iD_NhanVien của tôi + ID_NhanVien_Tao của phiếu (dòng Lập phiếu). */
  me?: { iD_NhanVien?: number | null; nguoiLapId?: unknown },
): FlowHistoryEvent[] => {
  const events: FlowHistoryEvent[] = [];
  const isMe = (id: unknown) =>
    me?.iD_NhanVien != null && id != null && Number(id) === Number(me.iD_NhanVien);
  const buocs = data?.buocs ?? [];
  const nguoiDuyets = data?.nguoiDuyets ?? [];
  const tenBuoc = formatFlowBuocTen;

  const lap = parseBeDate(ngayLap);
  if (lap) {
    events.push({
      time: lap,
      title: "Thêm mới",
      content: "Lập phiếu",
      by: nguoiLap ? String(nguoiLap) : undefined,
      byMe: isMe(me?.nguoiLapId),
      color: FLOW_HISTORY_COLOR.ThemMoi,
    });
  }

  buocs.forEach((buoc) => {
    const people = nguoiDuyets.filter((nguoi) => nguoi.iD_Flow_HoSo_Buoc === buoc.id);
    const mo = parseBeDate(buoc.ngayMo);
    if (mo) {
      const giao = people.filter((nguoi) => !nguoi.isChiXem).map(tenNguoi).filter(Boolean);
      const chiXem = people.filter((nguoi) => nguoi.isChiXem).map(tenNguoi).filter(Boolean);
      events.push({
        time: mo,
        title: FLOW_KET_QUA_CHO_XU_LY,
        content: [
          tenBuoc(buoc),
          giao.length ? `giao: ${giao.join(", ")}` : "",
          chiXem.length ? `chỉ xem: ${chiXem.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" — "),
        color: FLOW_HISTORY_COLOR.Khac,
      });
    }

    const boQua =
      buoc.tinhTrang === FLOW_BUOC_KHONG_Y_KIEN &&
      !people.some((nguoi) => nguoi.ketQua === FLOW_KET_QUA.KhongYKien);
    const xong = parseBeDate(buoc.ngayHoanTat) ?? mo;
    if (boQua && xong) {
      events.push({ time: xong, title: "Bỏ qua", content: tenBuoc(buoc), color: FLOW_HISTORY_COLOR.Khac });
    }
  });

  // Kết quả của lượt bị chạy lại nằm ở nguoiDuyetCus; dòng ketQua 4 ở đó đã có
  // trong traBuocs nên bỏ.
  const results: Array<FlowNguoiDuyet & { tenBuoc?: string | null }> = [
    ...nguoiDuyets,
    ...(data?.nguoiDuyetCus ?? []).filter((nguoi) => nguoi.ketQua !== FLOW_KET_QUA.TraBuoc),
  ];
  results.forEach((nguoi) => {
    const time = parseBeDate(nguoi.ngayDuyet);
    if (!time || nguoi.ketQua == null) return;
    const buoc = buocs.find((step) => step.id === nguoi.iD_Flow_HoSo_Buoc);
    events.push({
      time,
      title: FLOW_KET_QUA_LABEL[nguoi.ketQua] ?? "",
      content: buoc ? tenBuoc(buoc) : nguoi.tenBuoc ?? undefined,
      by: tenNguoi(nguoi) || undefined,
      byMe: isMe(nguoi.iD_NhanVien),
      note: nguoi.yKien ?? undefined,
      noteLabel: "Ý kiến",
      color:
        nguoi.ketQua === FLOW_KET_QUA.Duyet
          ? FLOW_HISTORY_COLOR.Duyet
          : nguoi.ketQua === FLOW_KET_QUA.TuChoi
          ? FLOW_HISTORY_COLOR.TuChoi
          : FLOW_HISTORY_COLOR.Khac,
    });
  });

  (data?.traBuocs ?? []).forEach((tra) => {
    const time = parseBeDate(tra.ngayTra);
    if (!time) return;
    events.push({
      time,
      title: "Trả bước",
      content: [tra.tenBuocTu, tra.tenBuocVe].filter(Boolean).join(" → "),
      by: tra.iD_NhanVien_MoTa ?? undefined,
      byMe: isMe(tra.iD_NhanVien),
      note: tra.lyDo ?? undefined,
      noteLabel: "Lý do",
      color: FLOW_HISTORY_COLOR.TraBuoc,
    });
  });

  const congViec = data?.congViec;
  const taoLuc = parseBeDate(congViec?.ngayTao);
  if (congViec && taoLuc) {
    events.push({
      time: taoLuc,
      title: "Tạo công việc",
      content:
        [congViec.soCongViec, congViec.tieuDe].filter(Boolean).join(" - ") +
        (congViec.chuTri ? ` · chủ trì: ${congViec.chuTri}` : ""),
      by: congViec.nguoiTao ?? undefined,
      color: FLOW_HISTORY_COLOR.Duyet,
    });
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
};

/** Bước còn thiếu người duyệt (mỗi bước ít nhất 1 người). Rỗng = đủ. */
export const getMissingSteps = (data: FlowChonNguoi | null, chons: FlowChonNguoiPair[]) =>
  (data?.buocs ?? []).filter(
    (buoc) => !chons.some((chon) => chon.iD_Buoc === buoc.iD_Buoc),
  );

/** Dòng phiếu → entity gửi lên: bỏ `<name>_MoTa` (cột hiển thị, không phải cột bảng). */
export const stripDisplayColumns = (record: Record<string, any>) => {
  const entity: Record<string, any> = {};
  Object.keys(record).forEach((key) => {
    if (!key.endsWith("_MoTa")) entity[key] = record[key];
  });
  return entity;
};

/**
 * Số phiếu đã cấp, đọc theo tên cột của flow (`soPhieuField`, từ
 * get-class-by-name). null khi chưa khai cột hoặc phiếu nháp chưa có số.
 */
export const getFlowSoPhieu = (
  record: FlowRecord | null | undefined,
  soPhieuField: string | null | undefined,
) => {
  const value = soPhieuField ? readItemValue(record, soPhieuField) : null;
  return value != null && String(value).trim() ? String(value).trim() : null;
};

/** Nhãn phiếu để hiện (thẻ, tiêu đề dialog, xác nhận xoá): số phiếu, chưa có thì "#<id>". */
export const getFlowLabel = (
  record: FlowRecord | null | undefined,
  soPhieuField: string | null | undefined,
) => getFlowSoPhieu(record, soPhieuField) ?? `#${record?.id ?? ""}`;

/**
 * Câu báo sau khi xử lý xong 1 phiếu (dải thông báo ngắn, thay cho im lặng):
 * "Đã duyệt phiếu PDN-001", "Đã trả bước phiếu #12"...
 */
export const getFlowDoneMessage = (ketQua: number, phieuLabel: string) => {
  switch (ketQua) {
    case FLOW_KET_QUA.Duyet:
      return `Đã duyệt phiếu ${phieuLabel}`;
    case FLOW_KET_QUA.TuChoi:
      return `Đã từ chối phiếu ${phieuLabel}`;
    case FLOW_KET_QUA.KhongYKien:
      return `Đã gửi "Không ý kiến" cho phiếu ${phieuLabel}`;
    case FLOW_KET_QUA.TraBuoc:
      return `Đã trả bước phiếu ${phieuLabel}`;
    default:
      return `Đã xử lý phiếu ${phieuLabel}`;
  }
};

/**
 * Dòng đầu thẻ chi tiết phiếu: tên Loại đề nghị (ID_LoaiFlow — cột hệ thống
 * mọi flow đều có). Phiếu chưa có loại thì về tên flow.
 */
export const getFlowHeading = (
  record: FlowRecord | null | undefined,
  flowName: string | null | undefined,
) => {
  const loai = readItemValue(record, `${FLOW_FIELD.ID_LoaiFlow}_MoTa`);
  const text = loai == null ? "" : String(loai).trim();

  return text || (flowName ?? "");
};
