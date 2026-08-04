import { blockParamsKey } from "../src/screens/Home/shared/useSolarDashboard";
import { getDateRangeForPeriod } from "../src/screens/Home/SolarPlantScreen.helpers";

// Khoá này quyết định khi nào một khối bị coi là đang giữ số của kỳ KHÁC
// (`isStale`) — tức là khi nào màn hình dựng khung chờ thay vì vẽ số cũ. Sai khoá
// thì hoặc biểu đồ nhảy một nhịp dữ liệu sai, hoặc nhấp nháy khung chờ vô cớ.

const day = (year: number, month: number, date: number) =>
  new Date(year, month - 1, date);

describe("blockParamsKey", () => {
  const weekOfAug3 = getDateRangeForPeriod("Week", day(2026, 8, 3));
  const augustMonth = getDateRangeForPeriod("Month", day(2026, 8, 3));

  it("khối cân bằng đổi khoá theo cả kỳ và khoảng ngày", () => {
    expect(blockParamsKey("balance", "Week", weekOfAug3)).not.toBe(
      blockParamsKey("balance", "Month", augustMonth),
    );
    // Cùng khoảng ngày nhưng khác kỳ vẫn phải khác khoá: `timeUnit` gửi cho API
    // suy từ kỳ, nên dữ liệu trả về khác nhau.
    expect(blockParamsKey("balance", "Week", augustMonth)).not.toBe(
      blockParamsKey("balance", "Month", augustMonth),
    );
  });

  it("khối so sánh chỉ đổi khoá khi sang năm khác", () => {
    // Đổi Ngày ↔ Tuần ↔ Tháng trong cùng năm: biểu đồ so sánh phải đứng yên.
    expect(blockParamsKey("compare", "Week", weekOfAug3)).toBe(
      blockParamsKey("compare", "Month", augustMonth),
    );
    expect(
      blockParamsKey(
        "compare",
        "Year",
        getDateRangeForPeriod("Year", day(2025, 8, 3)),
      ),
    ).not.toBe(blockParamsKey("compare", "Week", weekOfAug3));
  });

  it("khối công suất chỉ đổi khoá khi sang ngày khác", () => {
    const aug2 = getDateRangeForPeriod("Day", day(2026, 8, 2));
    const aug3 = getDateRangeForPeriod("Day", day(2026, 8, 3));

    expect(blockParamsKey("power", "Day", aug2)).not.toBe(
      blockParamsKey("power", "Day", aug3),
    );
  });

  it("khối không phụ thuộc kỳ luôn cùng một khoá", () => {
    expect(blockParamsKey("flow", "Week", weekOfAug3)).toBe(
      blockParamsKey("flow", "Month", augustMonth),
    );
    expect(blockParamsKey("overview", "Week", weekOfAug3)).toBe("");
    expect(blockParamsKey("env", "Year", augustMonth)).toBe("");
  });
});
