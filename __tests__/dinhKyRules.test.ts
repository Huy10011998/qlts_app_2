import {
  buildDinhKyDates,
  formatDinhKyTime,
  validateDinhKyDates,
} from "../src/screens/Workflow/CongViec/dinhKyRules";
import { toBeDate } from "../src/screens/Workflow/shared/workflowDate";

// Luật sinh định kỳ chép từ mục 4 của 4-Mobile-CongViec (usp_CV_SinhNgayDinhKy).
// App chỉ dùng để xem trước — các ví dụ dưới đây lấy nguyên từ tài liệu BE.

const days = (dates: Date[]) => dates.map((date) => toBeDate(date).slice(0, 10));

const base = {
  kieuLap: 1,
  moiN: 1,
  thuTrongTuan: [] as number[],
  ngayBatDau: new Date(2026, 9, 7),
  ketThucNgay: null as Date | null,
  soLan: 3 as number | null,
};

describe("buildDinhKyDates", () => {
  it("Ngày: bắt đầu, +N ngày, +2N ngày", () => {
    expect(days(buildDinhKyDates({ ...base, moiN: 2 }))).toEqual([
      "2026-10-07",
      "2026-10-09",
      "2026-10-11",
    ]);
  });

  it("Tuần: ví dụ tài liệu — bắt đầu T4 07/10, thứ 2 và 5 → T5 08/10, T2 12/10, T5 15/10", () => {
    expect(
      days(buildDinhKyDates({ ...base, kieuLap: 2, thuTrongTuan: [2, 5], soLan: 3 })),
    ).toEqual(["2026-10-08", "2026-10-12", "2026-10-15"]);
  });

  it("Tuần: cứ N tuần một lần, tính từ tuần chứa ngày bắt đầu", () => {
    expect(
      days(buildDinhKyDates({ ...base, kieuLap: 2, moiN: 2, thuTrongTuan: [5], soLan: 3 })),
    ).toEqual(["2026-10-08", "2026-10-22", "2026-11-05"]);
  });

  it("Tháng: ví dụ tài liệu — 31/01/2027 → 28/02 → 31/03 → 30/04 (không trôi)", () => {
    expect(
      days(buildDinhKyDates({ ...base, kieuLap: 3, ngayBatDau: new Date(2027, 0, 31), soLan: 4 })),
    ).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
    // Năm nhuận thì 29/02.
    expect(
      days(buildDinhKyDates({ ...base, kieuLap: 3, ngayBatDau: new Date(2028, 0, 31), soLan: 2 })),
    ).toEqual(["2028-01-31", "2028-02-29"]);
  });

  it("Năm: 29/02 → 28/02 năm không nhuận", () => {
    expect(
      days(buildDinhKyDates({ ...base, kieuLap: 4, ngayBatDau: new Date(2028, 1, 29), soLan: 2 })),
    ).toEqual(["2028-02-29", "2029-02-28"]);
  });

  it("Kết thúc theo ngày: lần có ngày <= ngày kết thúc vẫn tạo", () => {
    expect(
      days(buildDinhKyDates({ ...base, soLan: null, ketThucNgay: new Date(2026, 9, 9) })),
    ).toEqual(["2026-10-07", "2026-10-08", "2026-10-09"]);
  });

  it("không sinh ra lần nào / vượt 366 lần thì báo lỗi trước khi gửi", () => {
    const none = buildDinhKyDates({ ...base, soLan: null, ketThucNgay: new Date(2026, 9, 1) });
    expect(none).toEqual([]);
    expect(validateDinhKyDates(none)).toMatch(/không sinh ra lần nào/);

    const tooMany = buildDinhKyDates({ ...base, soLan: null, ketThucNgay: new Date(2028, 0, 1) });
    expect(tooMany).toHaveLength(367);
    expect(validateDinhKyDates(tooMany)).toMatch(/vượt 366/);
    expect(validateDinhKyDates(tooMany.slice(0, 10))).toBeNull();
  });
});

describe("formatDinhKyTime", () => {
  it("giờ của Từ → giờ của Đến, kèm số ngày khi kéo qua ngày", () => {
    expect(formatDinhKyTime(new Date(2026, 9, 7, 8), new Date(2026, 9, 7, 17))).toBe("08:00 → 17:00");
    expect(formatDinhKyTime(new Date(2026, 9, 7, 22), new Date(2026, 9, 8, 6))).toBe(
      "22:00 → 06:00 (sau 1 ngày)",
    );
  });
});
