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
import { isCongViecChuaXong } from "../shared/workflowConstants";

/**
 * Tính toán của lịch công việc (6-Mobile-Lich-CongViec). Tuần bắt đầu thứ Hai;
 * khoảng [Từ, Đến) là đúng những ngày ĐANG HIỆN trên lịch.
 */

export type LichMode = "thang" | "tuan" | "homnay";

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

/**
 * Lưới tháng: từ thứ Hai của tuần chứa ngày 1 tới hết tuần chứa ngày cuối tháng
 * (4–6 hàng, gồm vài ngày tháng trước / sau đang lộ ra). Tài liệu lấy ví dụ lưới
 * 42 ô như web (tháng 10/2026 tới 08/11 → Đến = 09/11); mobile bỏ hàng toàn ngày
 * tháng sau cho gọn nên Đến = 02/11 — vẫn đúng luật [Từ, Đến) = ngày đang hiện.
 */
export const getMonthRange = (anchor: Date): LichRange => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const from = startOfWeek(first);
  const to = addDays(startOfWeek(last), 7);
  return { from, to, days: listDays(from, to) };
};

/** Tuần: thứ Hai 00:00 tới thứ Hai tuần sau 00:00. */
export const getWeekRange = (anchor: Date): LichRange => {
  const from = startOfWeek(anchor);
  const to = addDays(from, 7);
  return { from, to, days: listDays(from, to) };
};

/** Một ngày: 00:00 hôm đó tới 00:00 hôm sau (chế độ Hôm nay, anchor = hôm nay). */
export const getDayRange = (anchor: Date): LichRange => {
  const from = startOfDay(anchor);
  const to = addDays(from, 1);
  return { from, to, days: [from] };
};

export const getRange = (mode: LichMode, anchor: Date) =>
  mode === "thang"
    ? getMonthRange(anchor)
    : mode === "tuan"
      ? getWeekRange(anchor)
      : getDayRange(anchor);

/** Lùi / tiến 1 tháng hoặc 1 tuần (Hôm nay không có ‹ ›). */
export const shiftAnchor = (mode: LichMode, anchor: Date, step: number) =>
  mode === "thang"
    ? new Date(anchor.getFullYear(), anchor.getMonth() + step, 1)
    : addDays(anchor, step * 7);

/**
 * Ngày được chọn sau khi sang tháng / tuần khác: kỳ có hôm nay thì chọn hôm nay
 * (đi tới rồi quay về là về đúng ngày hiện tại); kỳ khác thì ngày 1 của tháng /
 * ngày `anchor` của tuần như trước. Chế độ Hôm nay: luôn hôm nay.
 */
export const pickSelectedDay = (mode: LichMode, anchor: Date, now = new Date()) => {
  const today = startOfDay(now);
  if (mode === "homnay") return today;
  if (mode === "thang") {
    const sameMonth =
      today.getFullYear() === anchor.getFullYear() && today.getMonth() === anchor.getMonth();
    return sameMonth ? today : startOfDay(anchor);
  }
  const { from, to } = getWeekRange(anchor);
  return today >= from && today < to ? today : startOfDay(anchor);
};

export const formatRangeLabel = (mode: LichMode, anchor: Date, range: LichRange) => {
  if (mode === "thang") return `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}`;
  if (mode === "homnay") return formatWeekday(anchor);
  const last = addDays(range.to, -1);
  return `${formatDay(range.from).slice(0, 5)} - ${formatDay(last)}`;
};

export const formatWeekday = (date: Date) =>
  `${WEEKDAY_NAMES[date.getDay()]}, ${formatDay(date)}`;

/** "Thứ 3" / "Chủ nhật" — tên thứ đứng riêng trên thẻ ngày. */
export const formatWeekdayName = (date: Date) => WEEKDAY_NAMES[date.getDay()];

/** "T3" / "CN" — nhãn ngắn trong ô ngày kiểu tờ lịch. */
export const formatWeekdayShort = (date: Date) => WEEKDAY_LABELS[mondayIndex(date)];

/**
 * Điều kiện "nằm trong khoảng" = GIAO với khoảng: DenNgay >= Từ VÀ TuNgay < Đến
 * (việc kéo dài nhiều ngày, bắt đầu trước khoảng vẫn hiện).
 */
export const buildRangeConditions = (
  range: Pick<LichRange, "from" | "to">,
): WorkflowCondition[] => [
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

/** Khoảng + bộ lọc màu của lần tải xong gần nhất. */
export type LichLoaded = { from: Date; to: Date; mau: string };

export const toMauKey = (mau: string[]) => [...mau].sort().join(",");

/**
 * Khoảng mới nằm gọn trong khoảng vừa tải, cùng bộ lọc (vd Tháng → Tuần trong
 * cùng lưới tháng): dữ liệu đã đủ trên màn, chỉ cần làm mới ngầm.
 */
export const isRangeLoaded = (
  loaded: LichLoaded | null,
  range: Pick<LichRange, "from" | "to">,
  mau: string[],
) =>
  !!loaded &&
  loaded.mau === toMauKey(mau) &&
  loaded.from.getTime() <= range.from.getTime() &&
  range.to.getTime() <= loaded.to.getTime();

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

/**
 * Chỗ vạch "Bây giờ" trong danh sách việc hôm nay (đã xếp theo giờ bắt đầu):
 * ngay trước việc đầu tiên chưa tới giờ bắt đầu; việc nào cũng đã bắt đầu thì
 * nằm cuối.
 */
export const getNowLineIndex = (tasks: Pick<CongViecItem, "tuNgay">[], now = new Date()) => {
  const index = tasks.findIndex(
    (task) => (parseBeDate(task.tuNgay)?.getTime() ?? 0) > now.getTime(),
  );
  return index === -1 ? tasks.length : index;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);

export type TaskDeadline = {
  label: string;
  /** late: đã quá hạn · soon: hạn hôm nay / ngày mai · normal: còn xa. */
  tone: "late" | "soon" | "normal";
};

/**
 * Nhãn hạn bằng chữ cạnh giờ của việc trên lịch — màu viền thôi thì dễ lướt qua.
 * Chỉ việc chưa xong (Mới / Đang xử lý). Quá hạn tính như server: Đến ngày <
 * bây giờ, số ngày đếm từ ngày của Đến ngày. Còn hạn thì đếm tới NGÀY CUỐI của
 * việc (Đến ngày đúng 00:00 = hết hạn đầu ngày → hạn là ngày trước đó).
 */
export const getTaskDeadline = (
  item: Pick<CongViecItem, "trangThai" | "tuNgay" | "denNgay">,
  now = new Date(),
): TaskDeadline | null => {
  if (!isCongViecChuaXong(item.trangThai)) return null;
  const den = parseBeDate(item.denNgay);
  const span = getTaskDaySpan(item);
  if (!den || !span) return null;

  if (den.getTime() < now.getTime()) {
    const late = daysBetween(den, now);
    return { label: late > 0 ? `Quá hạn ${late} ngày` : "Quá hạn", tone: "late" };
  }

  const left = daysBetween(now, span.end);
  if (left <= 0) return { label: "Hạn hôm nay", tone: "soon" };
  if (left === 1) return { label: "Hạn ngày mai", tone: "soon" };
  return { label: `Còn ${left} ngày`, tone: "normal" };
};

/**
 * Dòng tóm tắt dưới tên thứ của thẻ ngày: bao nhiêu việc đã quá hạn, bao nhiêu
 * việc hạn hôm nay / ngày mai — đếm theo đúng nhãn hạn trên từng việc.
 */
export const countDeadlines = (
  tasks: Pick<CongViecItem, "trangThai" | "tuNgay" | "denNgay">[],
  now = new Date(),
) => {
  let late = 0;
  let soon = 0;
  tasks.forEach((task) => {
    const tone = getTaskDeadline(task, now)?.tone;
    if (tone === "late") late += 1;
    else if (tone === "soon") soon += 1;
  });
  return { late, soon };
};

/** Số việc theo màu (maMau) — số trên chip lọc của lịch, mỗi việc đếm một lần. */
export const countTasksByMau = (tasksByDay: Map<string, CongViecItem[]>) => {
  const seen = new Set<number>();
  const counts: Record<string, number> = {};
  tasksByDay.forEach((list) =>
    list.forEach((task) => {
      if (seen.has(task.id)) return;
      seen.add(task.id);
      const key = String(task.maMau ?? "");
      counts[key] = (counts[key] ?? 0) + 1;
    }),
  );
  return counts;
};
