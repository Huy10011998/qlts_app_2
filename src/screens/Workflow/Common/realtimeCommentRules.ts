import type { WorkflowComment } from "../../../types/index";
import { parseBeDate } from "../shared/workflowDate";

/**
 * Luật thuần của bình luận realtime (7-Mobile-Realtime-BinhLuan mục 3, 4).
 */

/** Hạn của 1 chỉ báo "đang nhập": quá 40 giây không nghe nhắc lại thì tự bỏ. */
export const DANG_NHAP_TTL_MS = 40_000;
/** Còn focus ô nhập thì nhắc lại "đang nhập" mỗi 15 giây. */
export const DANG_NHAP_KEEPALIVE_MS = 15_000;

export type DangNhapEntry = { iD_NhanVien: number; ten: string; expiresAt: number };

const timeOf = (comment: WorkflowComment) => parseBeDate(comment.ngayTao)?.getTime() ?? 0;

/**
 * Thêm bình luận "BinhLuanMoi" nếu CHƯA có id đó (mình vừa gửi rồi nạp lại thì
 * đã có), xếp theo ngayTao. Trả lại đúng mảng cũ khi không đổi.
 */
export const mergeRealtimeComment = (items: WorkflowComment[], comment: WorkflowComment) => {
  if (!comment || items.some((item) => item.id === comment.id)) return items;
  return [...items, comment].sort((a, b) => timeOf(a) - timeOf(b) || a.id - b.id);
};

/**
 * Cập nhật danh sách "đang nhập" theo 1 sự kiện DangNhap. Bỏ qua chính mình
 * (máy khác của mình). Thứ tự = ai nhập trước; nhắc lại chỉ gia hạn, không đổi chỗ.
 */
export const applyDangNhap = (
  list: DangNhapEntry[],
  event: { iD_NhanVien: number; ten?: string | null; dangNhap: boolean },
  myId: number | null | undefined,
  now: number,
): DangNhapEntry[] => {
  const id = Number(event?.iD_NhanVien);
  if (!Number.isFinite(id) || (myId != null && id === Number(myId))) return list;
  if (!event.dangNhap) return removeDangNhap(list, id);

  const expiresAt = now + DANG_NHAP_TTL_MS;
  const index = list.findIndex((entry) => entry.iD_NhanVien === id);
  if (index < 0) return [...list, { iD_NhanVien: id, ten: event.ten?.trim() || "Ai đó", expiresAt }];
  return list.map((entry, i) =>
    i === index ? { ...entry, ten: event.ten?.trim() || entry.ten, expiresAt } : entry,
  );
};

export const removeDangNhap = (list: DangNhapEntry[], id: number | null | undefined) =>
  id != null && list.some((entry) => entry.iD_NhanVien === Number(id))
    ? list.filter((entry) => entry.iD_NhanVien !== Number(id))
    : list;

/** Bỏ người đã quá hạn 40 giây. Trả lại đúng mảng cũ khi không ai hết hạn. */
export const pruneDangNhap = (list: DangNhapEntry[], now: number) =>
  list.some((entry) => entry.expiresAt <= now)
    ? list.filter((entry) => entry.expiresAt > now)
    : list;

/** "{A} đang nhập" · "{A}, {B} đang nhập" · "Có {n} người đang nhập". */
export const formatDangNhapLabel = (list: DangNhapEntry[]) => {
  if (!list.length) return null;
  if (list.length === 1) return `${list[0].ten} đang nhập`;
  if (list.length === 2) return `${list[0].ten}, ${list[1].ten} đang nhập`;
  return `Có ${list.length} người đang nhập`;
};

/** Ảnh thu nhỏ: xin gấp mật độ điểm ảnh của màn, trong khoảng server nhận (64–1600). */
export const getThumbnailSize = (displayWidth: number, pixelRatio: number) =>
  Math.min(1600, Math.max(64, Math.round(displayWidth * Math.max(1, pixelRatio))));
