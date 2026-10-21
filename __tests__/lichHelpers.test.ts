import {
  buildRangeConditions,
  dayKey,
  formatTaskTime,
  formatWeekdayName,
  formatWeekdayShort,
  getMonthRange,
  getTaskDaySpan,
  getWeekRange,
  groupTasksByDay,
  isAllDayTask,
  isRangeLoaded,
} from "../src/screens/Workflow/Lich/lichHelpers";
import { toBeDate } from "../src/screens/Workflow/shared/workflowDate";

// Luật của 6-Mobile-Lich-CongViec: khoảng [Từ, Đến) là đúng những ngày đang
// hiện; tuần bắt đầu thứ Hai; denNgay đúng 00:00 là hết hạn đầu ngày → thanh
// kết thúc ở ngày trước đó.

describe("khoảng ngày của lịch", () => {
  it("tháng 10/2026 lộ từ 28/09 tới 08/11 (ví dụ của tài liệu) → Đến = 09/11", () => {
    const range = getMonthRange(new Date(2026, 9, 15));
    expect(toBeDate(range.from)).toBe("2026-09-28T00:00:00");
    expect(toBeDate(range.to)).toBe("2026-11-09T00:00:00");
    expect(range.days).toHaveLength(42);
  });

  it("tuần: thứ Hai 00:00 tới thứ Hai tuần sau", () => {
    const range = getWeekRange(new Date(2026, 9, 11)); // Chủ nhật 11/10
    expect(toBeDate(range.from)).toBe("2026-10-05T00:00:00");
    expect(toBeDate(range.to)).toBe("2026-10-12T00:00:00");
  });

  it("điều kiện GIAO với khoảng: DenNgay >= Từ và TuNgay < Đến, gửi số", () => {
    expect(buildRangeConditions(getMonthRange(new Date(2026, 9, 1)))).toEqual([
      { Property: "DenNgay", Operator: 4, Value: "2026-09-28T00:00:00", Type: 7 },
      { Property: "TuNgay", Operator: 3, Value: "2026-11-09T00:00:00", Type: 7 },
    ]);
  });
});

describe("vẽ việc lên ngày", () => {
  it("denNgay đúng 00:00 kết thúc ở ngày trước", () => {
    const span = getTaskDaySpan({ tuNgay: "2026-10-09T08:00:00", denNgay: "2026-10-11T00:00:00" })!;
    expect(dayKey(span.start)).toBe("2026-10-09");
    expect(dayKey(span.end)).toBe("2026-10-10");
  });

  it("cả ngày: Từ 00:00 và Đến 00:00 hoặc từ 23:59", () => {
    expect(isAllDayTask({ tuNgay: "2026-10-09T00:00:00", denNgay: "2026-10-10T00:00:00" })).toBe(true);
    expect(isAllDayTask({ tuNgay: "2026-10-09T00:00:00", denNgay: "2026-10-09T23:59:00" })).toBe(true);
    expect(isAllDayTask({ tuNgay: "2026-10-09T08:00:00", denNgay: "2026-10-09T17:00:00" })).toBe(false);
    expect(formatTaskTime({ tuNgay: "2026-10-09T08:00:00", denNgay: "2026-10-09T17:00:00" })).toBe("08:00 - 17:00");
    expect(formatTaskTime({ tuNgay: "2026-10-09T00:00:00", denNgay: "2026-10-10T00:00:00" })).toBe("Cả ngày");
  });

  it("việc kéo dài nhiều ngày rải vào từng ngày, cắt theo khoảng đang hiện", () => {
    const range = getWeekRange(new Date(2026, 9, 7));
    const byDay = groupTasksByDay(
      [
        { id: 1, trangThai: 1, tuNgay: "2026-10-01T08:00:00", denNgay: "2026-10-06T17:00:00" },
        { id: 2, trangThai: 0, tuNgay: "2026-10-06T07:00:00", denNgay: "2026-10-06T09:00:00" },
      ],
      range,
    );
    expect(byDay.get("2026-10-05")?.map((t) => t.id)).toEqual([1]);
    // Cùng ngày xếp theo giờ bắt đầu.
    expect(byDay.get("2026-10-06")?.map((t) => t.id)).toEqual([1, 2]);
    expect(byDay.has("2026-10-04")).toBe(false);
    expect(byDay.has("2026-10-07")).toBe(false);
  });
});

describe("đổi khoảng không chờ khi dữ liệu đã có", () => {
  const thang10 = getMonthRange(new Date(2026, 9, 1));
  const daTai = { from: thang10.from, to: thang10.to, mau: "" };

  it("Tháng → Tuần trong cùng lưới tháng: đã đủ dữ liệu", () => {
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 9, 13)), [])).toBe(true);
    // Tuần cuối lưới (02/11 – 08/11) vẫn nằm trong khoảng tới 09/11.
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 10, 5)), [])).toBe(true);
  });

  it("sang tháng / tuần ngoài lưới, đổi lọc màu hoặc chưa tải lần nào: phải tải", () => {
    expect(isRangeLoaded(daTai, getMonthRange(new Date(2026, 10, 1)), [])).toBe(false);
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 10, 10)), [])).toBe(false);
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 9, 13)), ["QuaHan"])).toBe(false);
    expect(isRangeLoaded(null, getWeekRange(new Date(2026, 9, 13)), [])).toBe(false);
  });

  it("Tuần → Tháng: tuần không phủ cả tháng nên phải tải", () => {
    const tuan = getWeekRange(new Date(2026, 9, 13));
    expect(isRangeLoaded({ from: tuan.from, to: tuan.to, mau: "" }, thang10, [])).toBe(false);
  });
});

describe("nhãn thứ trên thẻ ngày", () => {
  it("tên đầy đủ và nhãn ngắn khớp nhau, tuần bắt đầu thứ Hai", () => {
    // 19/10/2026 là thứ Hai, 25/10/2026 là Chủ nhật.
    expect(formatWeekdayName(new Date(2026, 9, 19))).toBe("Thứ 2");
    expect(formatWeekdayShort(new Date(2026, 9, 19))).toBe("T2");
    expect(formatWeekdayName(new Date(2026, 9, 20))).toBe("Thứ 3");
    expect(formatWeekdayShort(new Date(2026, 9, 20))).toBe("T3");
    expect(formatWeekdayName(new Date(2026, 9, 25))).toBe("Chủ nhật");
    expect(formatWeekdayShort(new Date(2026, 9, 25))).toBe("CN");
  });
});
