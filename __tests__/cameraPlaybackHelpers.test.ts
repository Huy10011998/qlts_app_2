import {
  addDays,
  addMonths,
  buildMockClipGroups,
  buildPlaybackClipGroups,
  formatClock,
  formatPlaybackStamp,
  getCalendarDates,
  getPlaybackDateLabel,
  getPlaybackSpeedBadge,
  getPlaybackSpeedLabel,
  getScrubSecAtOffset,
  getTimelineOffsetForSec,
  getTotalClipCount,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "../src/components/camera/shared/cameraPlaybackHelpers";

describe("camera playback helpers", () => {
  describe("formatClock", () => {
    it("pads hours, minutes and seconds", () => {
      expect(formatClock(9 * 3600 + 5 * 60 + 7)).toBe("09:05:07");
    });
    it("can omit seconds", () => {
      expect(formatClock(14 * 3600 + 48 * 60 + 3, false)).toBe("14:48");
    });
    it("clamps negatives and wraps past a full day", () => {
      expect(formatClock(-10)).toBe("00:00:00");
      expect(formatClock(86400 + 61)).toBe("00:01:01");
    });
  });

  it("formatPlaybackStamp renders dd-MM-yyyy HH:mm:ss", () => {
    const date = new Date(2026, 6, 24);
    expect(formatPlaybackStamp(date, 15 * 3600 + 60 + 32)).toBe(
      "24-07-2026 15:01:32",
    );
  });

  describe("speed labels", () => {
    it("marks 1x as the normal speed", () => {
      expect(getPlaybackSpeedLabel(1)).toBe("1 lần (Tốc độ bình thường)");
      expect(getPlaybackSpeedLabel(2)).toBe("2 lần");
      expect(getPlaybackSpeedLabel(0.5)).toBe("0.5 lần");
    });
    it("badge is compact", () => {
      expect(getPlaybackSpeedBadge(1)).toBe("1X");
      expect(getPlaybackSpeedBadge(0.5)).toBe("0.5X");
    });
  });

  describe("date helpers", () => {
    it("startOfDay zeroes the time", () => {
      const start = startOfDay(new Date(2026, 6, 24, 15, 1, 32));
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });
    it("addDays shifts without mutating the input", () => {
      const base = new Date(2026, 6, 24);
      expect(addDays(base, -1).getDate()).toBe(23);
      expect(base.getDate()).toBe(24);
    });
    it("builds a stable six-week calendar and changes months", () => {
      const july = new Date(2026, 6, 24);
      const august = addMonths(july, 1);
      const dates = getCalendarDates(july);

      expect(startOfMonth(july)).toEqual(new Date(2026, 6, 1));
      expect(august).toEqual(new Date(2026, 7, 1));
      expect(dates).toHaveLength(42);
      expect(dates[0].getDay()).toBe(0);
      expect(isSameDay(dates[dates.length - 1], dates[0])).toBe(false);
    });
    it("labels today specially and other days as dd-MM-yyyy", () => {
      const today = startOfDay(new Date(2026, 6, 24));
      expect(getPlaybackDateLabel(today, today)).toBe("Ngày hôm nay");
      expect(getPlaybackDateLabel(addDays(today, -1), today)).toBe(
        "23-07-2026",
      );
    });
  });

  describe("buildPlaybackClipGroups", () => {
    it("groups real recordings by hour and keeps actual clips", () => {
      const dayStartMs = new Date(2026, 6, 27, 0, 0, 0, 0).getTime();
      const at = (hour: number, minute: number) =>
        dayStartMs + (hour * 60 + minute) * 60 * 1000;
      const groups = buildPlaybackClipGroups(
        [
          { startMs: at(9, 10), endMs: at(9, 20) },
          { startMs: at(9, 15), endMs: at(9, 25) },
          { startMs: at(9, 30), endMs: at(10, 15) },
        ],
        dayStartMs
      );

      expect(groups.map((group) => group.hour)).toEqual([10, 9]);
      expect(groups[0].startSec).toBe(10 * 3600 + 15 * 60);
      expect(groups[1].startSec).toBe(10 * 3600);
      expect(groups[0].clipCount).toBe(1);
      expect(groups[1].clipCount).toBe(2);
      expect(groups[1].clips).toHaveLength(2);
      expect(groups[1].clips[0].startMs).toBe(at(9, 30));
      expect(groups[1].clips[1]).toMatchObject({
        startMs: at(9, 10),
        endMs: at(9, 25),
      });
    });
  });

  describe("coverage segments", () => {
    it("maps recordings to proportional segments, newest at the top", () => {
      const dayStartMs = new Date(2026, 6, 23).getTime();
      const at = (hour: number, minute: number) =>
        dayStartMs + hour * 3_600_000 + minute * 60_000;

      // Giờ 9 có hai đoạn: 09:10–09:25 và 09:30–09:45; giờ 10 có 10:00–10:15.
      const groups = buildPlaybackClipGroups(
        [
          { startMs: at(9, 10), endMs: at(9, 25) },
          { startMs: at(9, 30), endMs: at(9, 45) },
          { startMs: at(10, 0), endMs: at(10, 15) },
        ],
        dayStartMs
      );

      const hourNine = groups.find((group) => group.hour === 9)!;
      // Hàng giờ 9 trải từ 09:45 (mép trên) tới 09:10 (mép dưới) = 2100 giây.
      const span = hourNine.startSec - 9 * 3600 - 10 * 60;
      expect(span).toBe(2100);

      const [first, second] = hourNine.coverageSegments;
      // Đoạn muộn hơn (09:30–09:45) phải nằm trên: from = 0.
      expect(first.from).toBeCloseTo(0, 5);
      expect(first.to).toBeCloseTo(900 / span, 5);
      // Đoạn sớm hơn (09:10–09:25) chạm mép dưới: to = 1.
      expect(second.to).toBeCloseTo(1, 5);
    });
  });

  describe("buildMockClipGroups", () => {
    it("is deterministic for the same day", () => {
      expect(buildMockClipGroups(-2)).toEqual(buildMockClipGroups(-2));
    });

    it("builds groups sorted newest first with consistent durations", () => {
      const groups = buildMockClipGroups(0);

      expect(groups.length).toBeGreaterThan(0);
      groups.forEach((group, index) => {
        expect(group.clipCount).toBeGreaterThan(0);
        expect(group.durationSec).toBe(group.clipCount * 15);
        expect(group.coverageSegments.length).toBeGreaterThanOrEqual(2);
        group.coverageSegments.forEach((segment) => {
          expect(segment.from).toBeGreaterThanOrEqual(0);
          expect(segment.to).toBeLessThanOrEqual(1);
          expect(segment.to).toBeGreaterThan(segment.from);
        });
        if (index > 0) {
          expect(group.startSec).toBeLessThan(groups[index - 1].startSec);
        }
      });
    });

    it("getScrubSecAtOffset counts down while scrolling", () => {
      const groups = buildMockClipGroups(0);
      const rowHeight = 168;

      const atTop = getScrubSecAtOffset(groups, 0, rowHeight);
      const midway = getScrubSecAtOffset(groups, rowHeight / 2, rowHeight);
      const oneRowDown = getScrubSecAtOffset(groups, rowHeight, rowHeight);

      expect(atTop).toBe(groups[0].startSec);
      expect(midway!).toBeLessThan(atTop!);
      expect(oneRowDown).toBe(groups[1].startSec);
    });

    it("getScrubSecAtOffset clamps outside the timeline", () => {
      const groups = buildMockClipGroups(0);
      const last = groups[groups.length - 1];
      // Cuối timeline là mốc bắt đầu bản ghi sớm nhất, không phải anchor trên
      // của hàng cuối — người dùng phải cuộn được về đúng đầu playback.
      const earliestSec = Math.min(...last.clips.map((clip) => clip.startSec));

      expect(getScrubSecAtOffset(groups, -500, 168)).toBe(groups[0].startSec);
      expect(getScrubSecAtOffset(groups, 999999, 168)).toBe(earliestSec);
      expect(earliestSec).toBeLessThan(last.startSec);
    });

    it("maps the earliest recording second to the end of the timeline", () => {
      const groups = buildMockClipGroups(0);
      const rowHeight = 168;
      const last = groups[groups.length - 1];
      const earliestSec = Math.min(...last.clips.map((clip) => clip.startSec));

      expect(getTimelineOffsetForSec(groups, earliestSec, rowHeight)).toBe(
        groups.length * rowHeight
      );
      expect(getTimelineOffsetForSec(groups, 0, rowHeight)).toBe(
        groups.length * rowHeight
      );
    });

    it("getScrubSecAtOffset returns null without recordings", () => {
      expect(getScrubSecAtOffset([], 0, 168)).toBeNull();
      expect(getScrubSecAtOffset(buildMockClipGroups(0), 0, 0)).toBeNull();
    });

    it("converts a playback time back to its timeline offset", () => {
      const groups = buildMockClipGroups(0);
      const rowHeight = 168;
      const target =
        groups[0].startSec -
        (groups[0].startSec - groups[1].startSec) * 0.5;
      const offset = getTimelineOffsetForSec(groups, target, rowHeight);

      expect(offset).toBeCloseTo(rowHeight / 2);
      expect(getScrubSecAtOffset(groups, offset, rowHeight)).toBeCloseTo(
        target
      );
      expect(getTimelineOffsetForSec(groups, 86400, rowHeight)).toBe(0);
    });

    it("getTotalClipCount sums every group", () => {
      const groups = buildMockClipGroups(0);
      const expected = groups.reduce((sum, g) => sum + g.clipCount, 0);
      expect(getTotalClipCount(groups)).toBe(expected);
    });
  });
});
