import type { KeHoachItem } from "../../../types/index";

/**
 * Luật màn Kế hoạch (5-Mobile-KeHoach). Chủ trì = người tạo; số việc / % luôn
 * tính trên MỌI việc của kế hoạch.
 */

/** Vẽ riêng: chủ trì ở thẻ là ID_NhanVien_Tao, đã nằm trong metadata nên không loại. */
export const KH_DYNAMIC_SAVE_KEYS = ["TieuDe", "MoTa", "TuNgay", "DenNgay"] as const;

/** "x/y việc": x = soHoanThanh, y = soCongViec - soHuy. phanTram null → "-" và "0/0 việc". */
export const getKeHoachProgress = (item: Pick<
  KeHoachItem,
  "phanTram" | "soCongViec" | "soHoanThanh" | "soHuy"
>) => {
  const tong = Math.max(0, Number(item.soCongViec ?? 0) - Number(item.soHuy ?? 0));
  const xong = Number(item.soHoanThanh ?? 0);
  const percent = item.phanTram == null ? null : Number(item.phanTram);

  return {
    percent,
    label: percent == null ? "0/0 việc" : `${xong}/${tong} việc`,
  };
};

/** Là chủ trì: iD_NhanVien_Tao = nhân viên của tôi. */
export const isKeHoachChuTri = (item: Pick<KeHoachItem, "iD_NhanVien_Tao">, idNhanVien: number | null) =>
  !!idNhanVien && Number(item.iD_NhanVien_Tao) === idNhanVien;
