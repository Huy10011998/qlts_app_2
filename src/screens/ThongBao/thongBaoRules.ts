import type { ThongBaoItem, ThongBaoNhom } from "../../types/index";
import { addDays, formatDay, formatTime, isSameDay, parseBeDate } from "../Workflow/shared/workflowDate";

/**
 * Luật hiển thị thông báo chuông (8-Mobile-ThongBao mục 4–5): icon + màu theo
 * nhom/loai như web, nhãn nhóm, chữ thời gian, bấm mở đối tượng nào.
 */

/** Icon là tên MaterialIcons (web dùng Material). */
type LoaiStyle = { icon: string; color: string };

const GREY = "#5c6873";
const BLUE = "#1e88e5";

const LOAI_STYLES: Record<string, Record<string, LoaiStyle>> = {
  Flow: {
    ChoDuyet: { icon: "how-to-reg", color: "#e65100" },
    DeBiet: { icon: "visibility", color: GREY },
    HoanTat: { icon: "check-circle", color: "#2e7d32" },
    TuChoi: { icon: "cancel", color: "#c62828" },
    TraBuoc: { icon: "undo", color: "#f9a825" },
    BinhLuan: { icon: "chat-bubble", color: BLUE },
  },
  CongViec: {
    Giao: { icon: "assignment-ind", color: "#6a1b9a" },
    TrangThai: { icon: "swap-horiz", color: GREY },
    GiaHan: { icon: "more-time", color: GREY },
    BinhLuan: { icon: "chat-bubble", color: BLUE },
    SapHan: { icon: "alarm", color: "#f9a825" },
    QuaHan: { icon: "error-outline", color: "#c62828" },
  },
  KeHoach: {
    ThamGia: { icon: "group-add", color: "#6a1b9a" },
    CongViecMoi: { icon: "playlist-add", color: GREY },
  },
};

/** Chưa đọc: nền dòng #f1f6fd, chấm xanh #1e88e5 (mục 5). Bản tối tự chọn — web không có. */
export const UNREAD_BG = "#f1f6fd";
export const UNREAD_BG_DARK = "#1B2C49";
export const UNREAD_DOT = BLUE;
/** Icon nền tròn = màu nhạt (~14%) của màu chữ: 0x24 / 0xFF ≈ 14%. */
export const ICON_BG_ALPHA = "24";

const FALLBACK_STYLE: LoaiStyle = { icon: "notifications-none", color: GREY };

export const getThongBaoStyle = (item: Pick<ThongBaoItem, "nhom" | "loai">): LoaiStyle =>
  LOAI_STYLES[item.nhom]?.[item.loai] ?? FALLBACK_STYLE;

export const THONG_BAO_NHOM: { key: ThongBaoNhom; label: string }[] = [
  { key: "Flow", label: "Phiếu" },
  { key: "CongViec", label: "Công việc" },
  { key: "KeHoach", label: "Kế hoạch" },
];

export const getNhomLabel = (nhom: unknown) =>
  THONG_BAO_NHOM.find((item) => item.key === nhom)?.label ?? "Thông báo";

/**
 * "Vừa xong" · "5 phút trước" · "3 giờ trước" (trong ngày) · "Hôm qua 08:30" ·
 * "12/10/2026 08:30".
 */
export const formatThongBaoTime = (raw: unknown, now = new Date()) => {
  const date = parseBeDate(raw);
  if (!date) return "";

  if (isSameDay(date, now)) {
    // Giờ máy lệch chút so với server có thể ra số âm — coi như vừa xong.
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    return `${Math.floor(minutes / 60)} giờ trước`;
  }
  if (isSameDay(date, addDays(now, -1))) return `Hôm qua ${formatTime(date)}`;
  return `${formatDay(date)} ${formatTime(date)}`;
};

export type ThongBaoTarget =
  | { route: "CongViecChiTiet"; params: { id: number } }
  | { route: "KeHoachChiTiet"; params: { id: number } }
  | { route: "FlowChiTiet"; params: { nameClass: string; id: number } };

/** Bấm 1 thông báo mở đâu (mục 4): theo tenBang + iD_DoiTuong. */
export const resolveThongBaoTarget = (
  item: Pick<ThongBaoItem, "tenBang" | "iD_DoiTuong">,
): ThongBaoTarget | null => {
  const id = Number(item.iD_DoiTuong);
  const tenBang = item.tenBang?.trim();
  if (!tenBang || !id) return null;

  if (tenBang.toLowerCase() === "cv_congviec") {
    return { route: "CongViecChiTiet", params: { id } };
  }
  if (tenBang.toLowerCase() === "cv_kehoach") {
    return { route: "KeHoachChiTiet", params: { id } };
  }
  // Bảng khác = phiếu: màn phiếu Name = tenBang.
  return { route: "FlowChiTiet", params: { nameClass: tenBang, id } };
};

/** Chuông = 20 mới nhất; "Xem tất cả" = 20 / trang (mục 1). */
export const BELL_PAGE_SIZE = 20;
export const PAGE_SIZE = 20;

/** Đổi các dòng vừa đánh dấu sang đã đọc ("all" = mọi dòng). */
export const markThongBaoRead = (items: ThongBaoItem[], ids: number[] | "all") =>
  items.map((item) =>
    !item.daDoc && (ids === "all" || ids.includes(item.id)) ? { ...item, daDoc: true } : item,
  );

/** Thêm thông báo mới lên đầu, bỏ nếu đã có id (mục 3). */
export const prependThongBao = (items: ThongBaoItem[], next: ThongBaoItem) =>
  items.some((item) => item.id === next.id) ? items : [next, ...items];
