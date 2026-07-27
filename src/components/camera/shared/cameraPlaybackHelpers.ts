import { formatDMY } from "../../../utils/Date";

/**
 * Playback (phát lại) domain helpers.
 *
 * Backend chưa có API playback nên timeline/clip ở đây là dữ liệu giả được
 * sinh deterministic (không dùng Math.random) để render không nhảy giữa các
 * lần re-render. Khi có API thật chỉ cần thay `buildMockClipGroups`.
 */

export type PlaybackClipGroup = {
  clipCount: number;
  durationSec: number;
  hasPerson: boolean;
  id: string;
  /** Giây tính từ 00:00:00 của ngày đang xem. */
  startSec: number;
  /** Vị trí (0..1) các vạch đã ghi trên rail của nhóm. */
  tickOffsets: number[];
};

export const PLAYBACK_SPEED_OPTIONS = [16, 8, 4, 2, 1, 0.5] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number];

export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 1;

/** Số giây mỗi clip — dùng để suy ra độ dài của một nhóm clip. */
const SECONDS_PER_CLIP = 15;

export const getPlaybackSpeedLabel = (speed: PlaybackSpeed) =>
  speed === 1 ? "1 lần (Tốc độ bình thường)" : `${speed} lần`;

export const getPlaybackSpeedBadge = (speed: PlaybackSpeed) => `${speed}X`;

const toSeconds = (clock: string) => {
  const [hour = 0, minute = 0, second = 0] = clock.split(":").map(Number);
  return hour * 3600 + minute * 60 + second;
};

export const formatClock = (totalSec: number, withSeconds = true) => {
  const safeSec = Math.max(0, Math.floor(totalSec)) % 86400;
  const hour = String(Math.floor(safeSec / 3600)).padStart(2, "0");
  const minute = String(Math.floor((safeSec % 3600) / 60)).padStart(2, "0");

  if (!withSeconds) return `${hour}:${minute}`;

  const second = String(safeSec % 60).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
};

/** Tem thời gian overlay trên video: `dd-MM-yyyy HH:mm:ss`. */
export const formatPlaybackStamp = (date: Date, totalSec: number) =>
  `${formatDMY(date)} ${formatClock(totalSec)}`;

/** Nhãn của thanh chọn ngày. */
export const getPlaybackDateLabel = (date: Date, today: Date) => {
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return isSameDay ? "Ngày hôm nay" : formatDMY(date);
};

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const addMonths = (date: Date, amount: number) => {
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return startOfDay(next);
};

export const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const startOfMonth = (date: Date) =>
  startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** 6 tuần cố định để chiều cao lịch không thay đổi giữa các tháng. */
export const getCalendarDates = (visibleMonth: Date) => {
  const monthStart = startOfMonth(visibleMonth);
  const calendarStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) =>
    addDays(calendarStart, index)
  );
};

/** Pseudo-random deterministic theo seed — thay cho Math.random. */
const seededUnit = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const MOCK_GROUP_SEEDS: Array<{ clipCount: number; time: string }> = [
  { time: "14:48:03", clipCount: 24 },
  { time: "14:17:41", clipCount: 3 },
  { time: "13:28:12", clipCount: 4 },
  { time: "11:55:07", clipCount: 3 },
  { time: "10:32:55", clipCount: 7 },
  { time: "09:14:22", clipCount: 2 },
  { time: "07:48:36", clipCount: 5 },
];

const buildTickOffsets = (groupIndex: number, clipCount: number) => {
  const tickCount = Math.min(14, Math.max(4, clipCount * 2));

  return Array.from({ length: tickCount }, (_, tickIndex) =>
    seededUnit(groupIndex * 17 + tickIndex * 7 + 3),
  ).sort((a, b) => a - b);
};

/**
 * Sinh danh sách nhóm clip giả cho một ngày. `dayOffset` giúp mỗi ngày có dữ
 * liệu khác nhau nhưng vẫn ổn định khi quay lại cùng ngày đó.
 */
export const buildMockClipGroups = (
  dayOffset: number,
): PlaybackClipGroup[] => {
  const visibleCount = 4 + Math.floor(seededUnit(dayOffset + 1) * 3);

  return MOCK_GROUP_SEEDS.slice(0, visibleCount).map((seed, index) => {
    const clipCount = Math.max(
      1,
      seed.clipCount - Math.floor(seededUnit(dayOffset * 5 + index) * 2),
    );

    return {
      id: `${dayOffset}-${seed.time}`,
      startSec: toSeconds(seed.time),
      clipCount,
      durationSec: clipCount * SECONDS_PER_CLIP,
      hasPerson: true,
      tickOffsets: buildTickOffsets(index + dayOffset, clipCount),
    };
  });
};

export const getTotalClipCount = (groups: PlaybackClipGroup[]) =>
  groups.reduce((total, group) => total + group.clipCount, 0);

/**
 * Suy ra mốc thời gian tại một vị trí trên timeline.
 *
 * `offsetY` là khoảng cách từ đỉnh timeline tới vạch đọc. Các nhóm xếp mới
 * nhất ở trên nên nội suy giữa hai nhóm liền kề cho ra thời gian **giảm dần**
 * khi kéo xuống. Trả về null khi chưa có bản ghi nào.
 */
export const getScrubSecAtOffset = (
  groups: PlaybackClipGroup[],
  offsetY: number,
  rowHeight: number,
): number | null => {
  if (groups.length === 0 || rowHeight <= 0) return null;

  const rawIndex = Math.max(0, offsetY) / rowHeight;
  const index = Math.min(groups.length - 1, Math.floor(rawIndex));
  const current = groups[index];
  const next = groups[index + 1];

  if (!next) return current.startSec;

  const fraction = Math.min(1, Math.max(0, rawIndex - index));
  return current.startSec + (next.startSec - current.startSec) * fraction;
};

/**
 * Phép tính ngược của getScrubSecAtOffset: đổi một mốc giờ thành khoảng cách
 * từ đầu timeline. Các mốc ngoài vùng bản ghi được chặn ở hai đầu.
 */
export const getTimelineOffsetForSec = (
  groups: PlaybackClipGroup[],
  targetSec: number,
  rowHeight: number
): number => {
  if (groups.length === 0 || rowHeight <= 0) return 0;
  if (targetSec >= groups[0].startSec) return 0;

  for (let index = 0; index < groups.length - 1; index += 1) {
    const current = groups[index];
    const next = groups[index + 1];

    if (targetSec <= current.startSec && targetSec >= next.startSec) {
      const range = current.startSec - next.startSec;
      const fraction =
        range > 0 ? (current.startSec - targetSec) / range : 0;
      return (index + fraction) * rowHeight;
    }
  }

  return (groups.length - 1) * rowHeight;
};
