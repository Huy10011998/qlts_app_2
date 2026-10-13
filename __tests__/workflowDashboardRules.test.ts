import {
  getDashboardMax,
  getDashboardMonths,
  getMonthDelta,
  getStatusShare,
} from "../src/screens/Workflow/Dashboard/workflowDashboardRules";

// Khuôn đúng response cv-dashboard thật (4-Mobile-CongViec mục 10).
const sauThang = [
  { nam: 2026, thang: 10, soViec: 9, soHoanThanh: 1, nhan: "10/26" },
  { nam: 2026, thang: 9, soViec: 3, soHoanThanh: 1, nhan: "09/26" },
  { nam: 2025, thang: 12, soViec: null, soHoanThanh: -1 },
];

describe("workflowDashboardRules", () => {
  it("6 tháng xếp cũ → mới, dùng nhãn BE, thiếu nhãn thì tự ghép, số lỗi về 0", () => {
    expect(getDashboardMonths({ tongQuan: null, sauThang })).toEqual([
      { key: "2025-12", label: "12/25", soViec: 0, soHoanThanh: 0 },
      { key: "2026-9", label: "09/26", soViec: 3, soHoanThanh: 1 },
      { key: "2026-10", label: "10/26", soViec: 9, soHoanThanh: 1 },
    ]);
    expect(getDashboardMonths(null)).toEqual([]);
  });

  it("một trục chung cho cả hai chuỗi, tối thiểu 1", () => {
    expect(getDashboardMax(getDashboardMonths({ tongQuan: null, sauThang }))).toBe(9);
    expect(getDashboardMax([])).toBe(1);
  });

  it("so với tháng trước theo % như Home web (+200% = 9 so với 3)", () => {
    expect(getMonthDelta(9, 3)).toEqual({ trend: "up", value: "+200%" });
    expect(getMonthDelta(1, 4)).toEqual({ trend: "down", value: "−75%" });
    expect(getMonthDelta(3, 3)).toEqual({ trend: "flat", value: "0%" });
    // Tháng trước 0: không chia được → ghi số việc tăng.
    expect(getMonthDelta(5, 0)).toEqual({ trend: "up", value: "+5 việc" });
    expect(getMonthDelta(null, 0)).toEqual({ trend: "flat", value: "0%" });
  });

  it("thanh trạng thái = tỉ lệ trên tổng 4 số", () => {
    expect(getStatusShare(4, 9)).toBeCloseTo(4 / 9);
    expect(getStatusShare(0, 0)).toBe(0);
  });
});
