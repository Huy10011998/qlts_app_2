import {
  getKhachHangToaDoLabel,
  getToaDoRejectReason,
  toKhachHangSummary,
} from "../src/screens/NoiDia/shared/khachHangLookup";

describe("toKhachHangSummary", () => {
  it("đọc được record dù BE trả casing lộn xộn", () => {
    const summary = toKhachHangSummary({
      iD: 14127,
      Ma: "KH001",
      TEN: "Tạp hoá Bảy",
      LAT: " 10.762622 ",
      LNG: "106.660172",
    });

    expect(summary).toEqual({
      id: 14127,
      ma: "KH001",
      ten: "Tạp hoá Bảy",
      label: "KH001 - Tạp hoá Bảy",
      lat: "10.762622",
      lng: "106.660172",
    });
  });

  it("khách hàng chưa khai toạ độ thì lat/lng rỗng", () => {
    const summary = toKhachHangSummary({ id: 5, ma: "KH005", ten: "Quán Tư" });

    expect(summary?.lat).toBe("");
    expect(summary?.lng).toBe("");
  });

  it("lấy phần tử đầu khi API trả mảng", () => {
    expect(toKhachHangSummary([{ id: 9, ma: "KH009" }])?.id).toBe(9);
  });

  it("thiếu mã/tên thì label lùi về id", () => {
    expect(toKhachHangSummary({ id: 9 })?.label).toBe("9");
  });

  it("không có id hợp lệ thì trả null để phía gọi ẩn thao tác", () => {
    expect(toKhachHangSummary(null)).toBeNull();
    expect(toKhachHangSummary("KH001")).toBeNull();
    expect(toKhachHangSummary({ ma: "KH001" })).toBeNull();
    expect(toKhachHangSummary({ id: 0 })).toBeNull();
    expect(toKhachHangSummary({ id: -3 })).toBeNull();
  });
});

describe("getToaDoRejectReason", () => {
  it("toạ độ hợp lệ thì không có lý do chặn", () => {
    expect(getToaDoRejectReason("10.762622", "106.660172")).toBeNull();
    expect(getToaDoRejectReason("-33.868800", "-151.209300")).toBeNull();
  });

  it("chặn đúng (0, 0) — GPS chưa định vị được, không phải toạ độ thật", () => {
    expect(getToaDoRejectReason("0", "0")).toContain("(0, 0)");
    expect(getToaDoRejectReason("0.000000", "0.000000")).toContain("(0, 0)");
  });

  it("vẫn cho gửi khi chỉ một trong hai bằng 0", () => {
    expect(getToaDoRejectReason("0", "106.660172")).toBeNull();
    expect(getToaDoRejectReason("10.762622", "0")).toBeNull();
  });

  it("chặn toạ độ ngoài phạm vi hợp lệ", () => {
    expect(getToaDoRejectReason("91", "106.660172")).toContain("phạm vi");
    expect(getToaDoRejectReason("-90.5", "10")).toContain("phạm vi");
    expect(getToaDoRejectReason("10.762622", "181")).toContain("phạm vi");
    expect(getToaDoRejectReason("10.762622", "-180.1")).toContain("phạm vi");
  });

  it("chặn giá trị rỗng hoặc không phải số", () => {
    expect(getToaDoRejectReason("", "")).toContain("Không đọc được");
    expect(getToaDoRejectReason("abc", "106.660172")).toContain(
      "Không đọc được"
    );
  });
});

describe("getKhachHangToaDoLabel", () => {
  const base = { id: 1, ma: "KH001", ten: "Quán Tư", label: "KH001 - Quán Tư" };

  it("có đủ toạ độ thì hiện lat, lng", () => {
    expect(
      getKhachHangToaDoLabel({ ...base, lat: "10.762622", lng: "106.660172" })
    ).toBe("10.762622, 106.660172");
  });

  it("thiếu một trong hai giá trị vẫn coi là chưa có toạ độ", () => {
    expect(getKhachHangToaDoLabel({ ...base, lat: "", lng: "" })).toBe(
      "Chưa có toạ độ"
    );
    expect(getKhachHangToaDoLabel({ ...base, lat: "10.762622", lng: "" })).toBe(
      "Chưa có toạ độ"
    );
  });
});
