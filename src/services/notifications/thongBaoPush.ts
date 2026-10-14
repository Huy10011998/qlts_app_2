import notifee from "@notifee/react-native";

import { resolveThongBaoTarget } from "../../screens/ThongBao/thongBaoRules";
import { toBeDateTime } from "../../screens/Workflow/shared/workflowDate";
import type { ThongBaoItem } from "../../types/index";
import { warn } from "../../utils/Logger";

/**
 * Push thông báo chuông (8-Mobile-ThongBao mục 6): `data.type = "THONG_BAO"`,
 * mọi giá trị là chuỗi. Bấm push = đánh dấu đọc + mở đối tượng như bấm trong
 * chuông (mục 4). Push không có `type` (push badge im lặng của iOS) thì bỏ qua.
 */
export const THONG_BAO_PUSH_TYPE = "THONG_BAO";

export const isThongBaoPush = (data: Record<string, string> | undefined) =>
  data?.type === THONG_BAO_PUSH_TYPE;

const toPositiveInt = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

/** Mỗi nhóm gửi 1 khoá id riêng (Flow → iD_HoSo …); thiếu thì lấy iD_DoiTuong. */
const ID_KEY_BY_NHOM: Record<string, string> = {
  Flow: "iD_HoSo",
  CongViec: "iD_CongViec",
  KeHoach: "iD_KeHoach",
};

/** Màn mở khi bấm push — cùng luật với bấm 1 dòng trong chuông. */
export const buildThongBaoPushTarget = (data: Record<string, string>) => {
  const key = ID_KEY_BY_NHOM[data.nhom ?? ""];
  const id = toPositiveInt(key ? data[key] : undefined) ?? toPositiveInt(data.iD_DoiTuong);
  return id ? resolveThongBaoTarget({ tenBang: data.tenBang, iD_DoiTuong: id }) : null;
};

export const getThongBaoPushId = (data: Record<string, string>) =>
  toPositiveInt(data.iD_ThongBao);

/** Số chưa đọc lúc server gửi push (0 hợp lệ); null khi thiếu / sai. */
export const getPushSoChuaDoc = (data: Record<string, string>) => {
  const number = Number(data.soChuaDoc);
  return data.soChuaDoc != null && Number.isFinite(number) && number >= 0
    ? Math.round(number)
    : null;
};

/** Dựng 1 dòng thông báo từ push để hiện toast khi hub chưa kịp báo. */
export const thongBaoItemFromPush = (data: Record<string, string>): ThongBaoItem | null => {
  const id = getThongBaoPushId(data);
  if (!id) return null;
  const target = buildThongBaoPushTarget(data);
  return {
    id,
    nhom: data.nhom ?? "",
    loai: data.loai ?? "",
    tieuDe: data.title ?? "",
    noiDung: data.body ?? null,
    tenBang: data.tenBang ?? null,
    iD_DoiTuong: Number(target?.params.id) || toPositiveInt(data.iD_DoiTuong) || 0,
    nguoiGui: null,
    // Giờ địa phương không "Z" như BE trả.
    ngayTao: toBeDateTime(new Date()),
    daDoc: false,
  };
};

/*
 * Toast chỉ 1 lần mỗi thông báo: hub ("ThongBaoMoi") và push foreground có thể
 * tới cùng lúc — cái nào tới trước hiện, cái sau bỏ.
 */
const toastedIds = new Set<number>();
const TOASTED_LIMIT = 100;

export const claimThongBaoToast = (id: number | null | undefined) => {
  if (!id || toastedIds.has(id)) return false;
  toastedIds.add(id);
  if (toastedIds.size > TOASTED_LIMIT) {
    toastedIds.delete(toastedIds.values().next().value as number);
  }
  return true;
};

/* Sự kiện push → ThongBaoProvider (đang sống trong cây React). */
export type ThongBaoPushEvent =
  | { kind: "foreground"; data: Record<string, string> }
  /** Bấm push đã đánh dấu đọc xong — số chưa đọc còn lại. */
  | { kind: "read"; soChuaDoc: number };

const listeners = new Set<(event: ThongBaoPushEvent) => void>();

export const subscribeThongBaoPush = (listener: (event: ThongBaoPushEvent) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitThongBaoPush = (event: ThongBaoPushEvent) => {
  listeners.forEach((listener) => listener(event));
};

/**
 * Số trên icon app = số chưa đọc (mục 6) — ĐẶT, không xoá về 0. iOS lúc app
 * tắt do server đổi (aps.badge + push im lặng); app đặt lại khi mở / đọc.
 */
export const setAppBadgeCount = async (count: number) => {
  try {
    await notifee.setBadgeCount(Math.max(0, Math.round(count) || 0));
  } catch (err) {
    warn("[Push] Đặt số trên icon thất bại", err);
  }
};

/**
 * Gỡ khỏi khay các push thông báo ĐÃ ĐỌC (đọc trong app, trên web, máy khác) —
 * khay chỉ còn cái chưa đọc. Chỉ đụng push type "THONG_BAO", không đụng noti
 * camera. Máy không đọc được data của thông báo đang hiện thì bỏ qua.
 */
export const removeThongBaoFromTray = async (ids: number[] | "all") => {
  try {
    const shown = await notifee.getDisplayedNotifications();
    const targets = shown.filter((item) => {
      const data = item.notification?.data as Record<string, unknown> | undefined;
      if (!item.id || data?.type !== THONG_BAO_PUSH_TYPE) return false;
      return ids === "all" || ids.includes(Number(data.iD_ThongBao));
    });
    await Promise.all(targets.map((item) => notifee.cancelDisplayedNotification(item.id!)));
  } catch (err) {
    warn("[Push] Gỡ thông báo đã đọc khỏi khay thất bại", err);
  }
};

/** Số chưa đọc mới: đặt số trên icon; về 0 thì khay không còn thông báo chuông nào. */
export const syncThongBaoBadge = (soChuaDoc: number) => {
  setAppBadgeCount(soChuaDoc);
  if (soChuaDoc <= 0) removeThongBaoFromTray("all");
};
