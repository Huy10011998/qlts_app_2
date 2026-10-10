import type {
  FlowChonNguoi,
  FlowChonNguoiPair,
  FlowRecord,
  FlowThongTin,
} from "../../../types/index";
import {
  FLOW_TINH_TRANG_HOAN_TAT,
  FLOW_TINH_TRANG_NHAP,
} from "../shared/workflowConstants";
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
    nhanBan: perms.canInsert && linked,
    quyTrinh: (info?.soBuoc ?? 0) > 0,
    dinhKem: (info?.soFile ?? 0) > 0 || suaFile,
    suaFile,
  };
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
