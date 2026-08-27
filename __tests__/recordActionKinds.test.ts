import {
  FRIDGE_TRUNG_CHUYEN_KIND,
  FRIDGE_XAC_NHAN_VI_TRI_KIND,
  getChildClassActionKind,
  UNKNOWN_RECORD_ACTION_KIND,
} from "../src/constants/recordActionKinds";

/**
 * Loại việc là thứ duy nhất giúp chế độ quét nhớ được: chọn "Đánh giá" trên bình
 * BCC-014 thì quét hộp HCC-002 vẫn phải khớp, dù hai bản ghi con khác class.
 *
 * Suy từ tiền tố tên class server trả về, KHÔNG có bảng liệt kê nào trong app —
 * nghiệp vụ BE thêm sau này tự khớp, không phải sửa gì.
 */
describe("loại việc của class con", () => {
  it("cùng tiền tố thì cùng loại, dù khác loại thiết bị", () => {
    expect(getChildClassActionKind("DanhGia_BinhChuaChay")).toBe(
      getChildClassActionKind("DanhGia_HongChuaChay"),
    );
    expect(getChildClassActionKind("DanhGia_BinhChuaChay")).toBe(
      "child:danhgia",
    );
  });

  it("nghiệp vụ BE chưa ship cũng khớp sẵn, không cần khai trước", () => {
    expect(getChildClassActionKind("KiemKe_MayMoc")).toBe("child:kiemke");
    expect(getChildClassActionKind("BaoHong_TuChuaChay")).toBe("child:baohong");
  });

  it("khác tiền tố là khác loại", () => {
    expect(getChildClassActionKind("DanhGia_BinhChuaChay")).not.toBe(
      getChildClassActionKind("KiemKe_BinhChuaChay"),
    );
  });

  it("tên không có gạch dưới thì cả tên là tiền tố", () => {
    expect(getChildClassActionKind("LinhKien")).toBe("child:linhkien");
  });

  it("tên rỗng thì thành loại không xác định", () => {
    expect(getChildClassActionKind(undefined)).toBe(UNKNOWN_RECORD_ACTION_KIND);
    expect(getChildClassActionKind("   ")).toBe(UNKNOWN_RECORD_ACTION_KIND);
  });

  /**
   * Trung chuyển tủ lạnh (màn riêng trong app) và trung chuyển tài sản (bảng con
   * BE sẽ trả sau) là HAI nghiệp vụ khác nhau: khác class quyền, khác màn, khác
   * luồng. Gộp một loại là chọn "Trung chuyển" ở màn quét sẽ chạy sai việc.
   */
  it("việc của tủ lạnh không đụng loại của bảng con cùng tên", () => {
    expect(getChildClassActionKind("TrungChuyen_TaiSan")).not.toBe(
      FRIDGE_TRUNG_CHUYEN_KIND,
    );
    expect(getChildClassActionKind("XacNhanViTri_TaiSan")).not.toBe(
      FRIDGE_XAC_NHAN_VI_TRI_KIND,
    );
  });

  it("hai việc của tủ lạnh khác loại nhau", () => {
    expect(FRIDGE_TRUNG_CHUYEN_KIND).not.toBe(FRIDGE_XAC_NHAN_VI_TRI_KIND);
  });
});
