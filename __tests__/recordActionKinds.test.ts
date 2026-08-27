import {
  compareRecordActionKinds,
  getRecordActionKindForChildClass,
  getRecordActionKindInfo,
  RECORD_ACTION_KINDS,
} from "../src/constants/recordActionKinds";

// Loại việc suy từ TIỀN TỐ tên class con mà server trả về — một dòng trong bảng
// phủ hết mọi loại thiết bị, khác hẳn `reviewNameClasses` phải liệt kê từng cặp.
describe("loại việc của class con", () => {
  it("khớp tiền tố, một dòng phủ mọi loại thiết bị", () => {
    expect(getRecordActionKindForChildClass("DanhGia_BinhChuaChay")).toBe(
      "danhGia",
    );
    expect(getRecordActionKindForChildClass("DanhGia_HongChuaChay")).toBe(
      "danhGia",
    );
    // Loại thiết bị chưa có bảng đánh giá hôm nay: BE trả về là nhận ngay, không
    // phải thêm dòng nào — đó là điểm khác `reviewNameClasses` (liệt kê từng cặp).
    expect(getRecordActionKindForChildClass("DanhGia_MayMoc")).toBe("danhGia");
  });

  // Nghiệp vụ BE chưa ship (kiểm kê, báo hỏng) KHÔNG được khai tiền tố: khai là
  // đoán cách BE đặt tên. Chúng vẫn là việc dùng được bình thường ở thanh hành
  // động, chỉ mang kind "other" nên chưa chọn được làm chế độ quét.
  it("nghiệp vụ chưa ship thì là other, vẫn dùng được", () => {
    expect(getRecordActionKindForChildClass("KiemKe_BinhChuaChay")).toBe(
      "other",
    );
    expect(getRecordActionKindForChildClass("BaoHong_TuChuaChay")).toBe("other");
    expect(getRecordActionKindForChildClass("BaoTri_MayMoc")).toBe("other");
    expect(getRecordActionKindForChildClass("LinhKien")).toBe("other");
    expect(getRecordActionKindForChildClass(undefined)).toBe("other");
    expect(getRecordActionKindForChildClass("")).toBe("other");
  });

  // Hai nghiệp vụ tủ lạnh có màn riêng trong app, không đến từ bảng con — khai
  // tiền tố cho chúng là đoán thêm một cái tên BE chưa hề trả về.
  it("việc của tủ lạnh không khai tiền tố class con", () => {
    const fridgeKinds = ["xacNhanViTriTuLanh", "trungChuyenTuLanh"] as const;

    for (const kind of fridgeKinds) {
      expect(getRecordActionKindInfo(kind)?.childClassPrefix).toBeUndefined();
      // Nhãn phải nói rõ "tủ lạnh": trung chuyển tài sản là nghiệp vụ khác hẳn.
      expect(getRecordActionKindInfo(kind)?.label).toContain("tủ lạnh");
    }
  });

  it("không nhận nhầm tiền tố chỉ trùng một phần", () => {
    expect(getRecordActionKindForChildClass("DanhGiaXX_BinhChuaChay")).toBe(
      "other",
    );
    expect(getRecordActionKindForChildClass("PhuDanhGia_Binh")).toBe("other");
  });

  it("other xếp sau mọi loại đã đặt tên", () => {
    for (const info of RECORD_ACTION_KINDS) {
      expect(compareRecordActionKinds(info.kind, "other")).toBeLessThan(0);
    }
  });

  it("mọi loại đã đặt tên đều có nhãn và icon", () => {
    for (const info of RECORD_ACTION_KINDS) {
      const resolved = getRecordActionKindInfo(info.kind);

      expect(resolved?.label.trim()).toBeTruthy();
      expect(resolved?.icon.trim()).toBeTruthy();
    }

    expect(getRecordActionKindInfo("other")).toBeUndefined();
  });
});
