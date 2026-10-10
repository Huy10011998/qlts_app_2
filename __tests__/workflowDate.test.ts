import {
  addMonths,
  fromPickerDateTime,
  parseBeDate,
  toBeDate,
  toBeDateTime,
} from "../src/screens/Workflow/shared/workflowDate";

// Server nhận / trả giờ ĐỊA PHƯƠNG không "Z". Gửi kèm Z thì server hiểu là UTC
// và lệch 7 tiếng — nên không bao giờ được dùng toISOString().

describe("workflowDate", () => {
  it("gửi lên đúng giờ máy, không Z / offset", () => {
    const date = new Date(2026, 9, 9, 8, 5, 0);
    expect(toBeDateTime(date)).toBe("2026-10-09T08:05:00");
    expect(toBeDate(date)).toBe("2026-10-09T00:00:00");
    expect(toBeDateTime(date)).not.toMatch(/Z|[+-]\d{2}:\d{2}$/);
  });

  it("đọc chuỗi không offset là giờ địa phương", () => {
    const date = parseBeDate("2026-10-09T17:30:00")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([
      2026, 9, 9, 17, 30,
    ]);
    expect(parseBeDate("2026-10-09")!.getHours()).toBe(0);
    expect(parseBeDate("2026-10-09T17:30:00.123")!.getMinutes()).toBe(30);
    expect(parseBeDate("")).toBeNull();
    expect(parseBeDate("abc")).toBeNull();
  });

  it("ghép giá trị DatePicker + TimePicker", () => {
    expect(toBeDateTime(fromPickerDateTime("09-10-2026", "17:00")!)).toBe("2026-10-09T17:00:00");
    expect(fromPickerDateTime("", "17:00")).toBeNull();
  });

  it("cộng tháng giữ ngày nếu được, cuối tháng thì kẹp", () => {
    expect(toBeDate(addMonths(new Date(2026, 9, 10), 1))).toBe("2026-11-10T00:00:00");
    expect(toBeDate(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28T00:00:00");
  });
});
