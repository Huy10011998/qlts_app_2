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
  countDeadlines,
  countTasksByMau,
  getTaskDeadline,
  getNowLineIndex,
  getRange,
  pickSelectedDay,
} from "../src/screens/Workflow/Lich/lichHelpers";
import { toBeDate } from "../src/screens/Workflow/shared/workflowDate";

// Luật của 6-Mobile-Lich-CongViec: khoảng [Từ, Đến) là đúng những ngày đang
// hiện; tuần bắt đầu thứ Hai; denNgay đúng 00:00 là hết hạn đầu ngày → thanh
// kết thúc ở ngày trước đó.

describe("khoảng ngày của lịch", () => {
  it("tháng 10/2026 lộ từ 28/09 tới 01/11 (hết tuần có ngày 31) → Đến = 02/11", () => {
    const range = getMonthRange(new Date(2026, 9, 15));
    expect(toBeDate(range.from)).toBe("2026-09-28T00:00:00");
    expect(toBeDate(range.to)).toBe("2026-11-02T00:00:00");
    expect(range.days).toHaveLength(35);
  });

  it("tháng chỉ lấy đủ hàng cần: 4 hàng (02/2027), 6 hàng (08/2026), hết đúng Chủ nhật (05/2026)", () => {
    expect(getMonthRange(new Date(2027, 1, 1)).days).toHaveLength(28);
    expect(getMonthRange(new Date(2026, 7, 1)).days).toHaveLength(42);
    const thang5 = getMonthRange(new Date(2026, 4, 1));
    expect(toBeDate(thang5.to)).toBe("2026-06-01T00:00:00");
    expect(thang5.days).toHaveLength(35);
  });

  it("tuần: thứ Hai 00:00 tới thứ Hai tuần sau", () => {
    const range = getWeekRange(new Date(2026, 9, 11)); // Chủ nhật 11/10
    expect(toBeDate(range.from)).toBe("2026-10-05T00:00:00");
    expect(toBeDate(range.to)).toBe("2026-10-12T00:00:00");
  });

  it("điều kiện GIAO với khoảng: DenNgay >= Từ và TuNgay < Đến, gửi số", () => {
    expect(buildRangeConditions(getMonthRange(new Date(2026, 9, 1)))).toEqual([
      { Property: "DenNgay", Operator: 4, Value: "2026-09-28T00:00:00", Type: 7 },
      { Property: "TuNgay", Operator: 3, Value: "2026-11-02T00:00:00", Type: 7 },
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
    // Tuần cuối lưới (26/10 – 01/11) vẫn nằm trong khoảng tới 02/11.
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 9, 30)), [])).toBe(true);
  });

  it("sang tháng / tuần ngoài lưới, đổi lọc màu hoặc chưa tải lần nào: phải tải", () => {
    expect(isRangeLoaded(daTai, getMonthRange(new Date(2026, 10, 1)), [])).toBe(false);
    expect(isRangeLoaded(daTai, getWeekRange(new Date(2026, 10, 5)), [])).toBe(false);
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

describe("nhãn hạn trên thẻ việc", () => {
  // 27/10/2026 15:00.
  const now = new Date(2026, 9, 27, 15, 0, 0);
  const task = (denNgay: string, trangThai = 1) => ({
    trangThai,
    tuNgay: "2026-10-01T00:00:00",
    denNgay,
  });

  it("quá hạn đếm từ ngày của Đến ngày", () => {
    expect(getTaskDeadline(task("2026-10-14T00:00:00"), now)).toEqual({
      label: "Quá hạn 13 ngày",
      tone: "late",
    });
    expect(getTaskDeadline(task("2026-10-27T08:00:00"), now)?.label).toBe("Quá hạn");
  });

  it("còn hạn: hôm nay / ngày mai / còn n ngày, Đến ngày 00:00 tính về ngày trước", () => {
    expect(getTaskDeadline(task("2026-10-27T17:00:00"), now)).toEqual({
      label: "Hạn hôm nay",
      tone: "soon",
    });
    // 28/10 00:00 = hết hạn cuối ngày 27/10.
    expect(getTaskDeadline(task("2026-10-28T00:00:00"), now)?.label).toBe("Hạn hôm nay");
    expect(getTaskDeadline(task("2026-10-28T17:00:00"), now)?.label).toBe("Hạn ngày mai");
    expect(getTaskDeadline(task("2026-11-05T17:00:00"), now)).toEqual({
      label: "Còn 9 ngày",
      tone: "normal",
    });
  });

  it("việc đã Hoàn thành / Hủy thì không có nhãn", () => {
    expect(getTaskDeadline(task("2026-10-14T00:00:00", 2), now)).toBeNull();
    expect(getTaskDeadline(task("2026-10-14T00:00:00", 3), now)).toBeNull();
  });
});

describe("số trên chip lọc màu", () => {
  it("mỗi việc đếm một lần dù rải nhiều ngày", () => {
    const a = { id: 1, trangThai: 1, maMau: "QuaHan" };
    const b = { id: 2, trangThai: 1, maMau: "DangXuLy" };
    const byDay = new Map([
      ["2026-10-01", [a, b]],
      ["2026-10-02", [a]],
    ]);
    expect(countTasksByMau(byDay)).toEqual({ QuaHan: 1, DangXuLy: 1 });
  });
});

describe("vạch Bây giờ trong việc hôm nay", () => {
  const tasks = [
    { tuNgay: "2026-10-26T08:00:00" }, // kéo dài từ hôm trước
    { tuNgay: "2026-10-28T09:00:00" },
    { tuNgay: "2026-10-28T15:00:00" },
  ];

  it("đứng trước việc đầu tiên chưa tới giờ", () => {
    expect(getNowLineIndex(tasks, new Date(2026, 9, 28, 14, 30))).toBe(2);
    expect(getNowLineIndex(tasks, new Date(2026, 9, 26, 7, 0))).toBe(0);
  });

  it("việc nào cũng đã bắt đầu thì nằm cuối", () => {
    expect(getNowLineIndex(tasks, new Date(2026, 9, 28, 16, 0))).toBe(3);
  });
});

describe("tóm tắt hạn trên thẻ ngày", () => {
  it("đếm quá hạn và hạn hôm nay / ngày mai, bỏ việc đã xong và việc còn xa", () => {
    const now = new Date(2026, 9, 28, 10, 0);
    const tasks = [
      { trangThai: 1, tuNgay: "2026-10-01T08:00:00", denNgay: "2026-10-14T17:00:00" }, // quá hạn
      { trangThai: 0, tuNgay: "2026-10-28T08:00:00", denNgay: "2026-10-28T17:00:00" }, // hôm nay
      { trangThai: 1, tuNgay: "2026-10-28T08:00:00", denNgay: "2026-10-29T17:00:00" }, // ngày mai
      { trangThai: 0, tuNgay: "2026-10-28T08:00:00", denNgay: "2026-10-31T17:00:00" }, // còn xa
      { trangThai: 2, tuNgay: "2026-10-01T08:00:00", denNgay: "2026-10-02T17:00:00" }, // đã xong
    ];
    expect(countDeadlines(tasks, now)).toEqual({ late: 1, soon: 2 });
  });
});

describe("ngày được chọn khi đổi tháng / tuần", () => {
  // Hôm nay 27/10/2026 (thứ Ba).
  const now = new Date(2026, 9, 27, 15, 0, 0);

  it("quay về tháng có hôm nay thì chọn hôm nay, tháng khác chọn ngày 1", () => {
    expect(dayKey(pickSelectedDay("thang", new Date(2026, 9, 1), now))).toBe("2026-10-27");
    expect(dayKey(pickSelectedDay("thang", new Date(2026, 10, 1), now))).toBe("2026-11-01");
  });

  it("tuần có hôm nay thì chọn hôm nay, tuần khác giữ ngày anchor", () => {
    expect(dayKey(pickSelectedDay("tuan", new Date(2026, 9, 29), now))).toBe("2026-10-27");
    expect(dayKey(pickSelectedDay("tuan", new Date(2026, 10, 3), now))).toBe("2026-11-03");
  });

  it("chế độ Hôm nay luôn chọn hôm nay", () => {
    expect(dayKey(pickSelectedDay("homnay", new Date(2026, 10, 5), now))).toBe("2026-10-27");
  });
});

describe("chế độ Hôm nay", () => {
  it("khoảng là 00:00 hôm nay tới 00:00 ngày mai", () => {
    const range = getRange("homnay", new Date(2026, 9, 29, 14, 30));
    expect(toBeDate(range.from)).toBe("2026-10-29T00:00:00");
    expect(toBeDate(range.to)).toBe("2026-10-30T00:00:00");
    expect(range.days.map(dayKey)).toEqual(["2026-10-29"]);
  });

  it("Tháng → Hôm nay trong cùng lưới: dùng luôn dữ liệu đã tải", () => {
    const thang10 = getMonthRange(new Date(2026, 9, 1));
    const daTai = { from: thang10.from, to: thang10.to, mau: "" };
    expect(isRangeLoaded(daTai, getRange("homnay", new Date(2026, 9, 29)), [])).toBe(true);
    expect(isRangeLoaded(daTai, getRange("homnay", new Date(2026, 10, 5)), [])).toBe(false);
  });
});
