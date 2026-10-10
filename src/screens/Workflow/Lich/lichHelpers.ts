import type { CongViecItem, WorkflowCondition } from "../../../types/index";
import { SqlOperator, TypeProperty } from "../../../utils/Enum";
import {
  addDays,
  formatDay,
  formatTime,
  isSameDay,
  parseBeDate,
  startOfDay,
  toBeDate,
} from "../shared/workflowDate";

/**
 * Tính toán của lịch công việc (6-Mobile-Lich-CongViec). Tuần bắt đầu thứ Hai;
 * khoảng [Từ, Đến) là đúng những ngày ĐANG HIỆN trên lịch.
 */

export type LichMode = "thang" | "tuan";

export type LichRange = {
  /** Ngày đầu đang hiện, 00:00. */
  from: Date;
  /** Ngày SAU ngày cuối đang hiện, 00:00 (mốc loại trừ). */
  to: Date;
  days: Date[];
};

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKDAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/** Thứ Hai = 0 ... Chủ nhật = 6. */
const mondayIndex = (date: Date) => (date.getDay() + 6) % 7;

export const startOfWeek = (date: Date) => addDays(startOfDay(date), -mondayIndex(date));

const listDays = (from: Date, to: Date) => {
  const days: Date[] = [];
  for (let day = from; day < to; day = addDays(day, 1)) days.push(day);
  return days;
};

/** Lưới tháng luôn 6 hàng × 7 ô, như web — chiều cao lịch không nhảy khi đổi tháng. */
const MONTH_GRID_DAYS = 42;

/**
 * Lưới tháng: từ thứ Hai của tuần chứa ngày 1, đủ 42 ô (gồm vài ngày tháng
 * trước / sau đang lộ ra). Ví dụ của tài liệu: tháng 10/2026 lộ từ 28/09 tới
 * 08/11 → Đến = 09/11.
 */
export const getMonthRange = (anchor: Date): LichRange => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = startOfWeek(first);
  const to = addDays(from, MONTH_GRID_DAYS);
  return { from, to, days: listDays(from, to) };
};

/** Tuần: thứ Hai 00:00 tới thứ Hai tuần sau 00:00. */
export const getWeekRange = (anchor: Date): LichRange => {
  const from = startOfWeek(anchor);
  const to = addDays(from, 7);
  return { from, to, days: listDays(from, to) };
};

export const getRange = (mode: LichMode, anchor: Date) =>
  mode === "thang" ? getMonthRange(anchor) : getWeekRange(anchor);

/** Lùi / tiến 1 tháng hoặc 1 tuần. */
export const shiftAnchor = (mode: LichMode, anchor: Date, step: number) =>
  mode === "thang"
    ? new Date(anchor.getFullYear(), anchor.getMonth() + step, 1)
    : addDays(anchor, step * 7);

export const formatRangeLabel = (mode: LichMode, anchor: Date, range: LichRange) => {
  if (mode === "thang") return `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}`;
  const last = addDays(range.to, -1);
  return `${formatDay(range.from).slice(0, 5)} - ${formatDay(last)}`;
};

export const formatWeekday = (date: Date) =>
  `${WEEKDAY_NAMES[date.getDay()]}, ${formatDay(date)}`;

/**
 * Điều kiện "nằm trong khoảng" = GIAO với khoảng: DenNgay >= Từ VÀ TuNgay < Đến
 * (việc kéo dài nhiều ngày, bắt đầu trước khoảng vẫn hiện).
 */
export const buildRangeConditions = (range: LichRange): WorkflowCondition[] => [
  {
    Property: "DenNgay",
    Operator: SqlOperator.GreaterThanOrEqual,
    Value: toBeDate(range.from),
    Type: TypeProperty.Date,
  },
  {
    Property: "TuNgay",
    Operator: SqlOperator.LessThan,
    Value: toBeDate(range.to),
    Type: TypeProperty.Date,
  },
];

const isMidnight = (date: Date) =>
  date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;

/**
 * Các ngày việc chiếm: từ tuNgay.Date tới denNgay.Date. denNgay đúng 00:00 là
 * hết hạn ĐẦU ngày đó → coi là trọn ngày TRƯỚC (giống web: End = denNgay.Date
 * + 1 khi giờ 00:00, mốc End loại trừ).
 */
export const getTaskDaySpan = (item: Pick<CongViecItem, "tuNgay" | "denNgay">) => {
  const tu = parseBeDate(item.tuNgay);
  const den = parseBeDate(item.denNgay);
  if (!tu && !den) return null;

  const start = startOfDay(tu ?? den!);
  let end = startOfDay(den ?? tu!);
  if (den && isMidnight(den) && tu && den.getTime() > tu.getTime()) {
    end = addDays(end, -1);
  }
  if (end < start) end = start;

  return { start, end };
};

/** "Cả ngày": tuNgay 00:00 và denNgay 00:00 hoặc từ 23:59 trở đi. */
export const isAllDayTask = (item: Pick<CongViecItem, "tuNgay" | "denNgay">) => {
  const tu = parseBeDate(item.tuNgay);
  const den = parseBeDate(item.denNgay);
  if (!tu || !den || !isMidnight(tu)) return false;

  return isMidnight(den) || den.getHours() * 60 + den.getMinutes() >= 23 * 60 + 59;
};

/** Giờ của việc: "Cả ngày" / "08:00 - 17:00" / kèm ngày khi kéo dài nhiều ngày. */
export const formatTaskTime = (item: Pick<CongViecItem, "tuNgay" | "denNgay">) => {
  if (isAllDayTask(item)) return "Cả ngày";

  const tu = parseBeDate(item.tuNgay);
  const den = parseBeDate(item.denNgay);
  if (!tu || !den) return formatTime(tu ?? den);

  return isSameDay(tu, den)
    ? `${formatTime(tu)} - ${formatTime(den)}`
    : `${formatTime(tu)} ${formatDay(tu).slice(0, 5)} - ${formatTime(den)} ${formatDay(den).slice(0, 5)}`;
};

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Rải việc ra từng ngày đang hiện, mỗi ngày xếp theo giờ bắt đầu. */
export const groupTasksByDay = (items: CongViecItem[], range: LichRange) => {
  const byDay = new Map<string, CongViecItem[]>();
  const lastDay = addDays(range.to, -1);

  items.forEach((item) => {
    const span = getTaskDaySpan(item);
    if (!span) return;

    const from = span.start < range.from ? range.from : span.start;
    const to = span.end > lastDay ? lastDay : span.end;

    for (let day = from; day <= to; day = addDays(day, 1)) {
      const key = dayKey(day);
      const list = byDay.get(key) ?? [];
      list.push(item);
      byDay.set(key, list);
    }
  });

  byDay.forEach((list) =>
    list.sort(
      (a, b) =>
        (parseBeDate(a.tuNgay)?.getTime() ?? 0) - (parseBeDate(b.tuNgay)?.getTime() ?? 0),
    ),
  );

  return byDay;
};
