import {
  getAttendanceRateLevel,
  pickLowestAttendanceDepartments,
} from "../src/screens/Home/shared/homeAttendance";
import type { HomeDashboardDepartment } from "../src/screens/Home/shared/homeData";

const dept = (
  key: string,
  checkedIn: number,
  total: number
): HomeDashboardDepartment => ({
  key,
  code: key,
  name: `Phòng ${key}`,
  total,
  checkedIn,
  notCheckedIn: total - checkedIn,
});

describe("getAttendanceRateLevel", () => {
  it("dưới 50% là thấp, dưới 80% là vừa, còn lại là cao", () => {
    expect(getAttendanceRateLevel(8.6)).toBe("low");
    expect(getAttendanceRateLevel(49.9)).toBe("low");
    expect(getAttendanceRateLevel(50)).toBe("medium");
    expect(getAttendanceRateLevel(79.9)).toBe("medium");
    expect(getAttendanceRateLevel(80)).toBe("high");
    expect(getAttendanceRateLevel(100)).toBe("high");
  });

  it("không tính được tỉ lệ thì không tô màu", () => {
    expect(getAttendanceRateLevel(null)).toBeNull();
  });
});

describe("pickLowestAttendanceDepartments", () => {
  it("lấy các bộ phận tỉ lệ thấp nhất, thấp trước", () => {
    const departments = [
      dept("KHXNK", 97, 117), // 82,9%
      dept("KDND", 35, 409), // 8,6%
      dept("KT", 125, 148), // 84,5%
      dept("TCKT", 6, 11), // 54,5%
      dept("QTNS", 83, 90), // 92,2%
      dept("XSauce", 400, 420), // 95,2%
    ];

    expect(
      pickLowestAttendanceDepartments(departments, 3).map((item) => item.key)
    ).toEqual(["KDND", "TCKT", "KHXNK"]);
  });

  it("bằng tỉ lệ thì giữ thứ tự API; 0 người (không có tỉ lệ) xếp cuối", () => {
    const departments = [
      dept("TrongCa", 0, 0),
      dept("A", 5, 10),
      dept("B", 1, 2),
      dept("C", 1, 10),
    ];

    expect(
      pickLowestAttendanceDepartments(departments, 4).map((item) => item.key)
    ).toEqual(["C", "A", "B", "TrongCa"]);
  });

  it("không làm đổi thứ tự của mảng gốc", () => {
    const departments = [dept("A", 9, 10), dept("B", 1, 10)];

    pickLowestAttendanceDepartments(departments);

    expect(departments.map((item) => item.key)).toEqual(["A", "B"]);
  });
});
