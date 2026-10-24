import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, { AndroidImportance } from "@notifee/react-native";

import { resolveThongBaoTarget } from "../../screens/ThongBao/thongBaoRules";
import { toBeDateTime } from "../../screens/Workflow/shared/workflowDate";
import type { ThongBaoItem } from "../../types/index";
import { warn } from "../../utils/Logger";
import {
  ANDROID_SMALL_ICON,
  DEFAULT_PRESS_ACTION_ID,
  NOTIFICATION_COLOR,
  SILENT_CHANNEL_ID,
} from "./constants";

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
  return id ? resolveThongBaoTarget({ tenBang: data.tenBang, iD_DoiTuong: id, loai: data.loai }) : null;
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
 * Android không có API đặt số trên icon (notifee.setBadgeCount chỉ chạy iOS):
 * launcher tự cộng số của các thông báo đang nằm trên khay. Nên giữ 1 thông báo
 * tóm tắt im lặng mang `badgeCount` = phần còn thiếu, để tổng launcher đếm
 * (Samsung, Xiaomi, Oppo…) = số chưa đọc. Pixel / Android gốc chỉ hiện chấm.
 * Như Zalo / Messenger: người dùng xoá khay (tóm tắt bị xoá) là thôi hẳn tóm
 * tắt — icon chỉ còn đếm push tới sau đó, mở lại app không dựng lại. Đọc hết
 * (về 0) hoặc đăng xuất mới bật lại.
 */
export const THONG_BAO_BADGE_NOTIFICATION_ID = "thong-bao-chua-doc";

/** Mọi thao tác trên thông báo tóm tắt chạy nối tiếp — tránh đếm khay giữa chừng. */
let androidBadgeQueue: Promise<void> = Promise.resolve();
let androidBadgeCount = 0;

/** Người dùng đã xoá tóm tắt — lưu máy vì DISMISSED có thể tới lúc app tắt (headless). */
const BADGE_SUMMARY_DISMISSED_KEY = "thongBao.badgeSummaryDismissed";
let summaryDismissed: boolean | null = null;

const isSummaryDismissed = async () => {
  if (summaryDismissed == null) {
    summaryDismissed = (await AsyncStorage.getItem(BADGE_SUMMARY_DISMISSED_KEY).catch(() => null)) === "1";
  }
  return summaryDismissed;
};

const setSummaryDismissed = async (value: boolean) => {
  summaryDismissed = value;
  await (value
    ? AsyncStorage.setItem(BADGE_SUMMARY_DISMISSED_KEY, "1")
    : AsyncStorage.removeItem(BADGE_SUMMARY_DISMISSED_KEY)
  ).catch((err) => warn("[Push] Lưu cờ đã xoá tóm tắt thất bại", err));
};

const refreshAndroidBadge = () => {
  androidBadgeQueue = androidBadgeQueue.then(async () => {
    try {
      const count = androidBadgeCount;
      // Đọc hết / đăng xuất: lần sau có chưa đọc thì tóm tắt lại được hiện.
      if (count <= 0 && (await isSummaryDismissed())) await setSummaryDismissed(false);
      // Launcher đã đếm các thông báo khác trên khay (push chuông chưa đọc,
      // camera…) — tóm tắt chỉ bù phần còn lại.
      const shown = await notifee.getDisplayedNotifications();
      const others = shown.filter((item) => item.id !== THONG_BAO_BADGE_NOTIFICATION_ID).length;
      const missing = count - others;
      // Launcher đếm thông báo số 0 thành 1 → hết phần thiếu thì gỡ hẳn.
      if (missing <= 0 || (await isSummaryDismissed())) {
        await notifee.cancelDisplayedNotification(THONG_BAO_BADGE_NOTIFICATION_ID);
        return;
      }
      await notifee.displayNotification({
        id: THONG_BAO_BADGE_NOTIFICATION_ID,
        title: "Thông báo chưa đọc",
        body: `Bạn có ${count} thông báo chưa đọc`,
        data: { route: "ThongBao" },
        android: {
          channelId: SILENT_CHANNEL_ID,
          importance: AndroidImportance.LOW,
          badgeCount: missing,
          timestamp: Date.now(),
          showTimestamp: true,
          onlyAlertOnce: true,
          // Bấm mở chuông nhưng vẫn giữ trên khay — nó mang số trên icon.
          autoCancel: false,
          smallIcon: ANDROID_SMALL_ICON,
          color: NOTIFICATION_COLOR,
          pressAction: { id: DEFAULT_PRESS_ACTION_ID, launchActivity: "default" },
        },
      });
    } catch (err) {
      warn("[Push] Cập nhật thông báo tóm tắt (số trên icon) thất bại", err);
    }
  });
  return androidBadgeQueue;
};

/**
 * Người dùng xoá tóm tắt ("Xoá" khay / vuốt) → nhớ lại, không dựng lại nữa.
 * Huỷ bằng code (đủ số, về 0, đăng xuất) không phát DISMISSED.
 */
export const handleThongBaoBadgeDismissed = async (notification: { id?: string } | undefined) => {
  if (Platform.OS !== "android" || notification?.id !== THONG_BAO_BADGE_NOTIFICATION_ID) return;
  await setSummaryDismissed(true);
};

/**
 * Push chuông tới lúc app đang mở (Android): không banner (đã có toast) nhưng
 * vẫn đặt im lặng lên khay để launcher đếm, như lúc app tắt OS tự hiện. Đọc thì
 * `removeThongBaoFromTray` gỡ, bấm thì mở như push thường.
 */
export const showThongBaoInTray = (message: {
  id: string;
  title?: string;
  body?: string;
  data: Record<string, string>;
}) => {
  if (Platform.OS !== "android" || (!message.title && !message.body)) return;
  // Chung hàng đợi với tóm tắt: hiện xong mới đếm khay.
  androidBadgeQueue = androidBadgeQueue.then(async () => {
    try {
      await notifee.displayNotification({
        id: message.id,
        title: message.title,
        body: message.body,
        data: message.data,
        android: {
          channelId: SILENT_CHANNEL_ID,
          importance: AndroidImportance.LOW,
          // Không gắn giờ thì Samsung hiện ngày rác ("3/1/01").
          timestamp: Date.now(),
          showTimestamp: true,
          smallIcon: ANDROID_SMALL_ICON,
          color: NOTIFICATION_COLOR,
          pressAction: { id: DEFAULT_PRESS_ACTION_ID, launchActivity: "default" },
        },
      });
    } catch (err) {
      warn("[Push] Đặt push chuông lên khay thất bại", err);
    }
  });
  return refreshAndroidBadge();
};

/**
 * Số trên icon app = số chưa đọc (mục 6) — ĐẶT, không xoá về 0. iOS lúc app
 * tắt do server đổi (aps.badge + push im lặng); app đặt lại khi mở / đọc.
 */
export const setAppBadgeCount = async (count: number) => {
  const value = Math.max(0, Math.round(count) || 0);
  if (Platform.OS === "android") {
    androidBadgeCount = value;
    return refreshAndroidBadge();
  }
  try {
    await notifee.setBadgeCount(value);
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
    // Khay bớt push → thông báo tóm tắt bù lại cho đủ số trên icon.
    if (Platform.OS === "android" && targets.length) refreshAndroidBadge();
  } catch (err) {
    warn("[Push] Gỡ thông báo đã đọc khỏi khay thất bại", err);
  }
};

/** Số chưa đọc mới: đặt số trên icon; về 0 thì khay không còn thông báo chuông nào. */
export const syncThongBaoBadge = (soChuaDoc: number) => {
  setAppBadgeCount(soChuaDoc);
  if (soChuaDoc <= 0) removeThongBaoFromTray("all");
};
