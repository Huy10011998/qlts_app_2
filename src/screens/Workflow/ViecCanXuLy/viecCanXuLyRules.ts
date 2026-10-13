import type { WorkflowThongBao } from "../../../types/index";
import { formatDay, formatTime, isSameDay, parseBeDate, addDays } from "../shared/workflowDate";

/**
 * "Việc cần xử lý" = dữ liệu của cv-thong-bao (mục 10, 4-Mobile-CongViec). BE
 * gọi là thông báo nhưng đó là bảng tổng hợp lúc gọi: không ID, không trạng
 * thái đã đọc, dòng phiếu gộp cả bảng — nên app không đặt nó ở chuông mà mở
 * từ nút riêng cạnh chuông ở Trang chủ.
 */

/** Nhãn + icon + màu theo loại. */
export const VIEC_LOAI = [
  { key: "Flow", label: "Phiếu chờ duyệt", icon: "document-text-outline", color: "#7C3AED" },
  { key: "Giao", label: "Được giao", icon: "briefcase-outline", color: "#1e88e5" },
  { key: "SapHan", label: "Sắp đến hạn", icon: "alarm-outline", color: "#fb8c00" },
  { key: "QuaHan", label: "Quá hạn", icon: "alert-circle-outline", color: "#e53935" },
  { key: "BinhLuan", label: "Bình luận", icon: "chatbubble-ellipses-outline", color: "#0EA5E9" },
] as const;

const FALLBACK_LOAI = { key: "", label: "Khác", icon: "list-outline", color: "#78909c" };

export const getViecLoai = (loai: unknown) =>
  VIEC_LOAI.find((item) => item.key === loai) ?? FALLBACK_LOAI;

export type ViecTarget =
  | { route: "FlowChiTiet"; params: { nameClass: string; id: number } }
  | { route: "Flow"; params: { nameClass: string; tab: "ChoDuyet" } }
  | { route: "CongViecChiTiet"; params: { id: number } };

/**
 * Bấm 1 dòng mở đâu (mục 10, 4-Mobile-CongViec):
 *   · loại Flow: đúng 1 phiếu chờ (iD_HoSo) → mở thẳng phiếu; nhiều phiếu → màn
 *     phiếu của bảng đó ở tab Chờ duyệt;
 *   · có iD_CongViec → chi tiết công việc;
 *   · còn lại không mở gì.
 */
export const resolveViecTarget = (item: WorkflowThongBao): ViecTarget | null => {
  if (item.loai === "Flow" && item.tenBang) {
    return item.iD_HoSo
      ? { route: "FlowChiTiet", params: { nameClass: item.tenBang, id: Number(item.iD_HoSo) } }
      : { route: "Flow", params: { nameClass: item.tenBang, tab: "ChoDuyet" } };
  }
  if (item.iD_CongViec) {
    return { route: "CongViecChiTiet", params: { id: Number(item.iD_CongViec) } };
  }
  return null;
};

/** "Hôm nay 08:30" / "Hôm qua 17:05" / "09/10/2026 08:30". */
export const formatViecTime = (raw: unknown, now = new Date()) => {
  const date = parseBeDate(raw);
  if (!date) return "";
  if (isSameDay(date, now)) return `Hôm nay ${formatTime(date)}`;
  if (isSameDay(date, addDays(now, -1))) return `Hôm qua ${formatTime(date)}`;
  return `${formatDay(date)} ${formatTime(date)}`;
};
