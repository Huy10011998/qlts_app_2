import { formatDMY } from "../../../utils/Date";
import type { PlaybackRecording } from "../../../services/data/playbackApi";

/**
 * Playback (phát lại) domain helpers.
 *
 * Backend chưa có API playback nên timeline/clip ở đây là dữ liệu giả được
 * sinh deterministic (không dùng Math.random) để render không nhảy giữa các
 * lần re-render. Khi có API thật chỉ cần thay `buildMockClipGroups`.
 */

export type PlaybackClip = {
  durationSec: number;
  endMs: number;
  id: string;
  startMs: number;
  /** Giây tính từ 00:00:00 của ngày đang xem. */
  startSec: number;
};

export type PlaybackClipGroup = {
  clipCount: number;
  clips: PlaybackClip[];
  durationSec: number;
  hasPerson: boolean;
  hour: number;
  id: string;
  /** Giây tính từ 00:00:00 của ngày đang xem. */
  startSec: number;
  /** Epoch millisecond thật do API playback trả về. */
  startMs: number;
  endMs: number;
  /**
   * Các đoạn có bản ghi trên rail của hàng, theo tỷ lệ 0..1 tính từ mép trên
   * hàng (mép trên là mốc mới nhất, xuống dưới là về quá khứ). Vẽ đúng tỷ lệ nên
   * đọc được ngay chỗ nào ghi liên tục, chỗ nào mất — khác với kiểu rắc chấm
   * trước đây, số chấm chỉ tỷ lệ thô với mức phủ.
   */
  coverageSegments: Array<{ from: number; to: number }>;
};

// Native player phải bỏ quá nhiều frame khi tua nhanh, đặc biệt với camera FPS
// thấp/GOP dài. Giới hạn 2X cho trải nghiệm mobile ổn định hơn.
export const PLAYBACK_SPEED_OPTIONS = [2, 1, 0.5] as const;

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

/**
 * Thời lượng/vị trí trong một clip: `mm:ss`, chỉ thêm phần giờ khi cần. Khác
 * `formatClock` — vốn dùng cho mốc giờ trong ngày nên luôn có `HH:`.
 */
export const formatElapsed = (totalSec: number) => {
  const safeSec = Math.max(0, Math.floor(totalSec));
  const hour = Math.floor(safeSec / 3600);
  const minute = String(Math.floor((safeSec % 3600) / 60)).padStart(2, "0");
  const second = String(safeSec % 60).padStart(2, "0");

  return hour > 0 ? `${hour}:${minute}:${second}` : `${minute}:${second}`;
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

const buildMockCoverage = (groupIndex: number, clipCount: number) => {
  const segmentCount = Math.min(6, Math.max(2, clipCount));

  return Array.from({ length: segmentCount }, (_, index) => {
    const from = seededUnit(groupIndex * 17 + index * 7 + 3) * 0.85;
    const length = 0.05 + seededUnit(groupIndex * 11 + index * 5 + 1) * 0.1;
    return { from, to: Math.min(1, from + length) };
  }).sort((a, b) => a.from - b.from);
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

    const startSec = toSeconds(seed.time);
    const clips = Array.from({ length: clipCount }, (_, clipIndex) => {
      const clipStartSec = Math.max(0, startSec - clipIndex * 60);
      const startMs = clipStartSec * 1000;
      return {
        id: `${dayOffset}-${seed.time}-clip-${clipIndex}`,
        startMs,
        endMs: startMs + SECONDS_PER_CLIP * 1000,
        startSec: clipStartSec,
        durationSec: SECONDS_PER_CLIP,
      };
    });

    return {
      id: `${dayOffset}-${seed.time}`,
      hour: Math.floor(startSec / 3600),
      startSec,
      startMs: startSec * 1000,
      endMs: startSec * 1000 + clipCount * SECONDS_PER_CLIP * 1000,
      clipCount,
      clips,
      durationSec: clipCount * SECONDS_PER_CLIP,
      hasPerson: true,
      coverageSegments: buildMockCoverage(index + dayOffset, clipCount),
    };
  });
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Chuyển các khoảng ghi thật thành group theo giờ:
 * - khoảng trùng nhau được hợp nhất;
 * - khoảng đi qua ranh giới giờ được tách để mỗi clip chỉ thuộc một group;
 * - group có id cố định theo giờ nên polling live không làm timeline nhảy.
 */
export const buildPlaybackClipGroups = (
  recordings: PlaybackRecording[],
  dayStartMs: number
): PlaybackClipGroup[] => {
  const dayEndMs = dayStartMs + 24 * HOUR_MS;
  const normalized = recordings
    .slice()
    .map((recording) => ({
      startMs: Math.max(dayStartMs, recording.startMs),
      endMs: Math.min(dayEndMs, recording.endMs),
    }))
    .filter((recording) => recording.endMs > recording.startMs)
    .sort((a, b) => a.startMs - b.startMs)
    .reduce<PlaybackRecording[]>((merged, recording) => {
      const previous = merged[merged.length - 1];
      if (previous && recording.startMs < previous.endMs) {
        previous.endMs = Math.max(previous.endMs, recording.endMs);
      } else {
        merged.push({ ...recording });
      }
      return merged;
    }, []);

  const clipsByHour = new Map<number, PlaybackClip[]>();

  normalized.forEach((recording) => {
    let cursorMs = recording.startMs;
    while (cursorMs < recording.endMs) {
      const hour = Math.min(
        23,
        Math.max(0, Math.floor((cursorMs - dayStartMs) / HOUR_MS))
      );
      const hourEndMs = dayStartMs + (hour + 1) * HOUR_MS;
      const clipEndMs = Math.min(recording.endMs, hourEndMs);
      const clips = clipsByHour.get(hour) ?? [];
      clips.push({
        id: `${cursorMs}-${clipEndMs}`,
        startMs: cursorMs,
        endMs: clipEndMs,
        startSec: Math.round((cursorMs - dayStartMs) / 1000),
        durationSec: Math.max(1, Math.round((clipEndMs - cursorMs) / 1000)),
      });
      clipsByHour.set(hour, clips);
      cursorMs = clipEndMs;
    }
  });

  const groups = Array.from(clipsByHour.entries())
    .sort(([hourA], [hourB]) => hourB - hourA)
    .map(([hour, clips]) => {
      const sortedClips = clips.sort((a, b) => b.startMs - a.startMs);
      const durationSec = sortedClips.reduce(
        (total, clip) => total + clip.durationSec,
        0
      );
      const groupUpperMs = Math.max(
        ...sortedClips.map((clip) => clip.endMs)
      );

      return {
        id: `${dayStartMs}-hour-${hour}`,
        hour,
        startMs: dayStartMs + hour * HOUR_MS,
        endMs: dayStartMs + (hour + 1) * HOUR_MS,
        // Anchor trên của row là mốc mới nhất có dữ liệu trong giờ này.
        startSec: Math.round((groupUpperMs - dayStartMs) / 1000),
        clipCount: sortedClips.length,
        clips: sortedClips,
        durationSec,
        hasPerson: false,
        coverageSegments: [],
      };
    });

  return groups.map((group, groupIndex) => {
    const upperSec = group.startSec;
    const lowerSec =
      groups[groupIndex + 1]?.startSec ??
      Math.min(...group.clips.map((clip) => clip.startSec));
    const rowSpanSec = Math.max(1, upperSec - lowerSec);
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const coverageSegments = group.clips.flatMap((clip) => {
      const clipEndSec = Math.round((clip.endMs - dayStartMs) / 1000);
      const visibleStartSec = Math.max(lowerSec, clip.startSec);
      const visibleEndSec = Math.min(upperSec, clipEndSec);
      if (visibleEndSec <= visibleStartSec) return [];

      // Thời gian giảm dần khi đi xuống, nên mốc MUỘN hơn cho offset nhỏ hơn.
      return [
        {
          from: clamp01((upperSec - visibleEndSec) / rowSpanSec),
          to: clamp01((upperSec - visibleStartSec) / rowSpanSec),
        },
      ];
    });

    return { ...group, coverageSegments };
  });
};

/**
 * Mốc thời gian ở mép dưới của một row: chính là anchor trên của row kế tiếp,
 * còn row cuối (giờ sớm nhất) thì lấy mốc bắt đầu bản ghi sớm nhất trong giờ đó
 * — nhờ vậy cuộn hết timeline là đọc được đúng thời điểm đầu tiên của ngày.
 */
export const getRowLowerSec = (
  groups: PlaybackClipGroup[],
  index: number
): number =>
  groups[index + 1]?.startSec ??
  Math.min(...groups[index].clips.map((clip) => clip.startSec));

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
  const lowerSec = getRowLowerSec(groups, index);

  const fraction = Math.min(1, Math.max(0, rawIndex - index));
  return current.startSec + (lowerSec - current.startSec) * fraction;
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

  for (let index = 0; index < groups.length; index += 1) {
    const current = groups[index];
    const lowerSec = getRowLowerSec(groups, index);

    if (targetSec <= current.startSec && targetSec >= lowerSec) {
      const range = current.startSec - lowerSec;
      const fraction =
        range > 0 ? (current.startSec - targetSec) / range : 0;
      return (index + fraction) * rowHeight;
    }
  }

  return groups.length * rowHeight;
};
