import {
  DEFAULT_HOME_FEATURE_IDS,
  FALLBACK_ICON_NAME,
  createReportActions,
  getViewIconName,
  isReportFeatureId,
  toReportFeatureId,
  getViewMenuItemId,
  getViewOrderNumber,
  isVehicleCurrentLocationMobileView,
  isVehicleJourneyMobileView,
  isVehicleTrackingMobileView,
  normalizeHomeFeatureId,
} from "../src/screens/Home/shared/homeMenuHelpers";

const makeView = (overrides: Record<string, any> = {}) =>
  ({
    id: 7,
    label: "Tài sản",
    ma: "TaiSan",
    ...overrides,
  }) as any;

const makeMenuItem = (overrides: Record<string, any> = {}) =>
  ({
    iD_GroupMenu: 2,
    isViewWeb: true,
    label: "Hành trình",
    viewWebMobile: "VehicleJourney",
    ...overrides,
  }) as any;

describe("id chức năng Trang chủ", () => {
  it("đổi id ghim cũ sang id mới, id lạ thì giữ nguyên", () => {
    expect(normalizeHomeFeatureId("1")).toBe("2");
    expect(normalizeHomeFeatureId("5")).toBe("4");
    expect(normalizeHomeFeatureId("solar-dashboard")).toBe("solar-dashboard");
  });

  // Lưới shortcut trên Trang chủ rộng 3 cột; ghim mặc định nhiều hơn 3 là user
  // mới vào đã thấy Trang chủ dài ra hai dòng.
  it("ghim mặc định vừa đúng một hàng", () => {
    expect(DEFAULT_HOME_FEATURE_IDS).toHaveLength(3);
    expect(new Set(DEFAULT_HOME_FEATURE_IDS).size).toBe(3);
  });

  it("lấy thứ tự từ stt, thiếu stt thì lấy id", () => {
    expect(getViewOrderNumber(makeView({ stt: 3 }))).toBe(3);
    expect(getViewOrderNumber(makeView({ stt: undefined, id: 9 }))).toBe(9);
    expect(getViewMenuItemId(makeView({ stt: 3 }))).toBe("3");
  });
});

describe("báo cáo ghim ra Trang chủ", () => {
  const featureItems = [
    { id: "5", label: "Nội địa", groupMenuId: 11, viewPermission: "NoiDia" },
    { id: "3", label: "Camera", viewPermission: "Camera" },
    { id: "6", label: "BHLĐ", groupMenuId: 12, viewPermission: "BHLD" },
  ];

  // Đây là lý do phải có tiền tố: báo cáo sinh ra bằng cách spread lại chính chức
  // năng, nên nếu giữ nguyên id thì ghim báo cáo "Nội địa" sẽ làm sáng luôn card
  // chức năng "Nội địa" và Trang chủ hiện sai loại.
  it("id báo cáo không đụng id chức năng nguồn", () => {
    const reports = createReportActions(featureItems, () => undefined);
    const featureIds = new Set(featureItems.map((item) => item.id));

    reports.forEach((report) => {
      expect(featureIds.has(report.id)).toBe(false);
      expect(isReportFeatureId(report.id)).toBe(true);
    });
    featureItems.forEach((item) => {
      expect(isReportFeatureId(item.id)).toBe(false);
    });
  });

  it("chỉ chức năng có groupMenuId mới sinh ra báo cáo", () => {
    const reports = createReportActions(featureItems, () => undefined);

    expect(reports.map((report) => report.label)).toEqual([
      "Nội địa",
      "BHLĐ",
    ]);
    expect(reports.map((report) => report.id)).toEqual([
      toReportFeatureId("5"),
      toReportFeatureId("6"),
    ]);
  });

  it("gắn nhóm và icon để Trang chủ vẽ card màu tím", () => {
    const [report] = createReportActions(featureItems, () => undefined);

    expect(report.homeGroup).toBe("report");
    expect(report.iconName).toBe("document-text-outline");
  });

  it("mở báo cáo với đúng groupMenuId và quyền của chức năng nguồn", () => {
    const openReportScreen = jest.fn();
    const [report] = createReportActions(featureItems, openReportScreen);

    report.onPress();

    expect(openReportScreen).toHaveBeenCalledWith({
      groupMenuId: 11,
      titleHeader: "Nội địa",
      viewPermission: "NoiDia",
    });
  });
});

describe("icon chức năng từ API", () => {
  it("nhận tên icon hợp lệ", () => {
    expect(getViewIconName(makeView({ iconMobile: "cube-outline" }))).toBe(
      "cube-outline",
    );
  });

  it("rơi về icon mặc định khi API trả về đường dẫn ảnh hoặc chuỗi rỗng", () => {
    expect(getViewIconName(makeView({ iconMobile: "  " }))).toBe(
      FALLBACK_ICON_NAME,
    );
    expect(getViewIconName(makeView({ iconMobile: "icons/cube.png" }))).toBe(
      FALLBACK_ICON_NAME,
    );
    expect(
      getViewIconName(makeView({ iconMobile: "https://x.com/a.svg" })),
    ).toBe(FALLBACK_ICON_NAME);
    expect(getViewIconName(makeView({ iconMobile: undefined }))).toBe(
      FALLBACK_ICON_NAME,
    );
  });
});

describe("nhận diện chức năng phương tiện", () => {
  it("khớp đúng view của từng chức năng", () => {
    expect(isVehicleJourneyMobileView(makeMenuItem())).toBe(true);
    expect(
      isVehicleTrackingMobileView(
        makeMenuItem({ viewWebMobile: "VehicleTracking" }),
      ),
    ).toBe(true);
    expect(
      isVehicleCurrentLocationMobileView(
        makeMenuItem({ viewWebMobile: "VehicleCurrentLocation" }),
      ),
    ).toBe(true);
    expect(
      isVehicleJourneyMobileView(
        makeMenuItem({ viewWebMobile: "VehicleTracking" }),
      ),
    ).toBe(false);
  });

  it("chấp nhận mọi dạng cờ bật mà API có thể trả về", () => {
    [true, 1, "1", "true"].forEach((isViewWeb) => {
      expect(isVehicleJourneyMobileView(makeMenuItem({ isViewWeb }))).toBe(true);
    });

    [false, 0, "0", "false", undefined].forEach((isViewWeb) => {
      expect(isVehicleJourneyMobileView(makeMenuItem({ isViewWeb }))).toBe(
        false,
      );
    });
  });

  it("bỏ qua item ngoài nhóm menu 2 và item có khoảng trắng dư", () => {
    expect(isVehicleJourneyMobileView(makeMenuItem({ iD_GroupMenu: 1 }))).toBe(
      false,
    );
    expect(
      isVehicleJourneyMobileView(
        makeMenuItem({ viewWebMobile: " VehicleJourney " }),
      ),
    ).toBe(true);
  });
});
