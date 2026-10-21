import type { HomeDashboardDepartment } from "./homeData";
import { getHomeRatioPercent } from "./homeFormat";

/**
 * Khối điểm danh chỉ hiện sẵn chừng này bộ phận (tỉ lệ thấp nhất trước), phần
 * còn lại sau nút "Xem tất cả" — danh sách đủ dài tới mười mấy dòng, đẩy các
 * khối bên dưới đi rất xa.
 */
export const HOME_ATTENDANCE_PREVIEW_COUNT = 5;

export type HomeAttendanceRateLevel = "low" | "medium" | "high";

/** Ngưỡng tô màu tỉ lệ của một bộ phận: dưới 50% đỏ, dưới 80% cam, còn lại xanh. */
export const getAttendanceRateLevel = (
  percent: number | null,
): HomeAttendanceRateLevel | null => {
  if (percent == null) return null;
  if (percent < 50) return "low";
  if (percent < 80) return "medium";

  return "high";
};

/**
 * Các bộ phận tỉ lệ điểm danh thấp nhất. Bộ phận không tính được tỉ lệ (0 người)
 * xếp cuối; bằng tỉ lệ thì giữ thứ tự API (sttPrintRep) để danh sách không nhảy
 * mỗi lần làm mới.
 */
export const pickLowestAttendanceDepartments = (
  departments: HomeDashboardDepartment[],
  limit = HOME_ATTENDANCE_PREVIEW_COUNT,
): HomeDashboardDepartment[] =>
  departments
    .map((dept, index) => ({
      dept,
      index,
      percent: getHomeRatioPercent(dept.checkedIn, dept.total),
    }))
    .sort((a, b) => {
      if (a.percent == null && b.percent == null) return a.index - b.index;
      if (a.percent == null) return 1;
      if (b.percent == null) return -1;
      if (a.percent !== b.percent) return a.percent - b.percent;

      return a.index - b.index;
    })
    .slice(0, limit)
    .map((item) => item.dept);
