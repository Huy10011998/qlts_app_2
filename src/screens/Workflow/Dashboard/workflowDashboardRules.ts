import type { CongViecDashboard } from "../../../types/index";

/** Hai chuỗi cột 6 tháng — chữ y hệt chú thích web ("Công việc" · "Hoàn thành"). */
export const DASHBOARD_SERIES = {
  soViec: { label: "Công việc", color: "#1e88e5" },
  soHoanThanh: { label: "Hoàn thành", color: "#43a047" },
} as const;

/**
 * 4 dòng trạng thái của tongQuan, chữ + màu thanh như Home web: "Đã quá hạn"
 * đỏ, "Chưa đến hạn" cam, "Hoàn tất trễ hạn" hồng, "Hoàn tất đúng hạn" xanh lá.
 * Thanh = tỉ lệ trên tổng 4 số (web vẽ vậy).
 */
export const DASHBOARD_STATUS = [
  { key: "quaHan", label: "Đã quá hạn", color: "#e53935" },
  { key: "chuaDenHan", label: "Chưa đến hạn", color: "#fb8c00" },
  { key: "hoanTatTreHan", label: "Hoàn tất trễ hạn", color: "#ec407a" },
  { key: "hoanTatDungHan", label: "Hoàn tất đúng hạn", color: "#43a047" },
] as const;

export type DashboardMonth = {
  key: string;
  /** "10/26" — BE trả sẵn ở `nhan`, thiếu thì tự ghép. */
  label: string;
  soViec: number;
  soHoanThanh: number;
};

const toCount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
};

/** 6 tháng gần nhất, cũ → mới (BE đã xếp, xếp lại cho chắc). */
export const getDashboardMonths = (data: CongViecDashboard | null | undefined): DashboardMonth[] =>
  [...(data?.sauThang ?? [])]
    .filter((item) => item && Number.isFinite(Number(item.nam)) && Number.isFinite(Number(item.thang)))
    .sort((a, b) => a.nam * 12 + a.thang - (b.nam * 12 + b.thang))
    .map((item) => ({
      key: `${item.nam}-${item.thang}`,
      label:
        item.nhan?.trim() ||
        `${String(item.thang).padStart(2, "0")}/${String(item.nam).slice(-2)}`,
      soViec: toCount(item.soViec),
      soHoanThanh: toCount(item.soHoanThanh),
    }));

/** Đỉnh trục (một trục chung cho cả hai chuỗi), tối thiểu 1 để khỏi chia 0. */
export const getDashboardMax = (months: DashboardMonth[]) =>
  Math.max(1, ...months.flatMap((month) => [month.soViec, month.soHoanThanh]));

/**
 * Tháng này so với tháng trước như Home web: "+200%" (9 so với 3). Tháng
 * trước 0 thì không chia được — ghi số việc tăng thay cho %.
 */
export const getMonthDelta = (thisMonth: unknown, lastMonth: unknown) => {
  const now = toCount(thisMonth);
  const before = toCount(lastMonth);
  const diff = now - before;
  const trend = diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const);
  if (before === 0) {
    return { trend, value: diff > 0 ? `+${diff} việc` : "0%" };
  }
  const percent = Math.round((Math.abs(diff) / before) * 100);
  return { trend, value: `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${percent}%` };
};

/** Tỉ lệ của 1 dòng trạng thái trên tổng 4 dòng (0–1), như thanh trên web. */
export const getStatusShare = (value: unknown, total: number) =>
  total > 0 ? Math.min(1, toCount(value) / total) : 0;

export const getDashboardCount = toCount;
