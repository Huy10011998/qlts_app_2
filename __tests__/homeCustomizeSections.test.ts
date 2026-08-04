import {
  buildHomeCustomizeSections,
  filterHomeCustomizeSections,
  type HomeCustomizeItem,
} from "../src/screens/Home/shared/HomeCustomizeSheet";

const featureItems: HomeCustomizeItem[] = [
  { id: "2", label: "Tài sản", iconName: "cube-outline" },
  { id: "3", label: "Camera", iconName: "camera-outline" },
];
const vehicleItems: HomeCustomizeItem[] = [
  {
    id: "hanh-trinh-phuong-tien-mobile",
    label: "Hành trình phương tiện",
    iconName: "navigate-circle-outline",
    homeGroup: "vehicle",
  },
];
const reportItems: HomeCustomizeItem[] = [
  {
    id: "report:2",
    label: "Tài sản",
    iconName: "document-text-outline",
    homeGroup: "report",
  },
];

describe("buildHomeCustomizeSections", () => {
  it("giữ thứ tự chức năng · phương tiện · báo cáo", () => {
    const sections = buildHomeCustomizeSections({
      featureItems,
      reportItems,
      vehicleItems,
    });

    expect(sections.map((section) => section.key)).toEqual([
      "feature",
      "vehicle",
      "report",
    ]);
  });

  // Tài khoản không có quyền phương tiện thì GET_MENU_ACTIVE không trả về ô nào;
  // để lại tiêu đề "PHƯƠNG TIỆN" trống trông như lỗi tải.
  it("bỏ hẳn nhóm không có mục nào", () => {
    const sections = buildHomeCustomizeSections({
      featureItems,
      reportItems: [],
      vehicleItems: [],
    });

    expect(sections.map((section) => section.key)).toEqual(["feature"]);
  });
});

describe("filterHomeCustomizeSections", () => {
  const sections = buildHomeCustomizeSections({
    featureItems,
    reportItems,
    vehicleItems,
  });

  it("từ khoá rỗng thì trả về nguyên danh sách", () => {
    expect(filterHomeCustomizeSections(sections, "   ")).toBe(sections);
  });

  it("tìm không cần dấu và không phân biệt hoa thường", () => {
    const result = filterHomeCustomizeSections(sections, "phuong TIEN");

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("vehicle");
  });

  // Một nhãn có thể nằm ở cả nhóm chức năng và nhóm báo cáo ("Tài sản"), hai id
  // khác nhau nên phải hiện đủ hai dòng để ghim riêng.
  it("giữ cả chức năng và báo cáo cùng tên", () => {
    const result = filterHomeCustomizeSections(sections, "tài sản");

    expect(result.map((section) => section.key)).toEqual(["feature", "report"]);
    expect(result[0].items.map((item) => item.id)).toEqual(["2"]);
    expect(result[1].items.map((item) => item.id)).toEqual(["report:2"]);
  });

  it("không khớp gì thì không còn section nào", () => {
    expect(filterHomeCustomizeSections(sections, "khong-co")).toEqual([]);
  });
});
