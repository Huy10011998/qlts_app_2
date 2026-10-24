import {
  buildRelatedConditions,
  getWorkflowListRoute,
  isWorkflowOnlyClass,
} from "../src/screens/Workflow/shared/workflowRelated";
import { SqlOperator, TypeProperty } from "../src/utils/Enum";

/* Tab Chi tiết của Nhân viên có "Công việc" / "Kế hoạch" (get-class-reference
   trả CV_CongViec / CV_KeHoach, khoá ID_NhanVien_Tao). BE chặn get-list chung
   của hai bảng này (400) nên phải rẽ sang màn Workflow. */
describe("getWorkflowListRoute", () => {
  it("rẽ Công việc / Kế hoạch sang màn Workflow", () => {
    expect(getWorkflowListRoute("CV_CongViec")).toBe("CongViec");
    expect(getWorkflowListRoute("CV_KeHoach")).toBe("KeHoach");
    expect(getWorkflowListRoute(" CV_KeHoach ")).toBe("KeHoach");
  });

  it("bảng thường đi danh sách chung", () => {
    expect(getWorkflowListRoute("Asset_PC_LinhKien")).toBeNull();
    expect(getWorkflowListRoute("")).toBeNull();
    expect(getWorkflowListRoute(undefined)).toBeNull();
    expect(isWorkflowOnlyClass("NhanVien")).toBe(false);
    expect(isWorkflowOnlyClass("CV_CongViec")).toBe(true);
  });
});

describe("buildRelatedConditions", () => {
  it("lọc theo khoá ngoại tới bản ghi cha, Operator / Type gửi SỐ", () => {
    expect(
      buildRelatedConditions({ property: "ID_NhanVien_Tao", idRoot: "231" }),
    ).toEqual([
      {
        Property: "ID_NhanVien_Tao",
        Operator: SqlOperator.Equals,
        Value: 231,
        Type: TypeProperty.Int,
      },
    ]);
  });

  /* Rỗng nghĩa là "không lọc" ở cv-get-list — nơi mở màn dựa vào đây để không
     mở danh sách việc của MỌI người dưới tên một nhân viên. */
  it("rỗng khi thiếu field hoặc id không dùng được", () => {
    expect(buildRelatedConditions(undefined)).toEqual([]);
    expect(buildRelatedConditions({ property: " ", idRoot: "231" })).toEqual([]);
    expect(buildRelatedConditions({ property: "ID_NhanVien_Tao", idRoot: "" })).toEqual([]);
    expect(buildRelatedConditions({ property: "ID_NhanVien_Tao", idRoot: "abc" })).toEqual([]);
    expect(buildRelatedConditions({ property: "ID_NhanVien_Tao", idRoot: "0" })).toEqual([]);
  });
});
