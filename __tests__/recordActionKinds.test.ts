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
    // Class chưa tồn tại trên server, nhưng bảng đã có dòng nên nhận được ngay
    // khi BE trả về, không phải sửa app.
    expect(getRecordActionKindForChildClass("KiemKe_MayMoc")).toBe("kiemKe");
    expect(getRecordActionKindForChildClass("BaoHong_TuChuaChay")).toBe(
      "baoHong",
    );
  });

  it("không khớp tiền tố nào thì là other, không phải lỗi", () => {
    expect(getRecordActionKindForChildClass("BaoTri_MayMoc")).toBe("other");
    expect(getRecordActionKindForChildClass("LinhKien")).toBe("other");
    expect(getRecordActionKindForChildClass(undefined)).toBe("other");
    expect(getRecordActionKindForChildClass("")).toBe("other");
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
