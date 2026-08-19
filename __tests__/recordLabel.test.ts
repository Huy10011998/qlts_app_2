import { getRecordLabel } from "../src/components/assets/detailActions/useAssetRecordActions";
import { TypeProperty } from "../src/utils/Enum";

// Field của tài sản là động theo cấu hình class, không có key `code` cố định,
// nên định danh lấy từ field chữ đầu tiên đang hiển thị.
const MA_FIELD = [{ name: "Ma", typeProperty: TypeProperty.Text }] as any;

describe("định danh bản ghi", () => {
  it("lấy giá trị field chữ đầu tiên", () => {
    expect(getRecordLabel({ id: "7", Ma: "PC0015" }, MA_FIELD)).toBe("PC0015");
  });

  // Class Máy móc đặt "Hình ảnh 1" lên trước "Mã": lấy thẳng field đầu thì badge
  // trên header ra cả đường dẫn ảnh.
  it("bỏ qua field ảnh đứng trước mã", () => {
    const fields = [
      { name: "HinhAnh1", typeProperty: TypeProperty.Image },
      { name: "Ma", typeProperty: TypeProperty.String },
    ] as any;

    expect(
      getRecordLabel(
        { id: "7", HinhAnh1: "PROPERTY\\679A6BE7.JPG", Ma: "TP1-0416" },
        fields,
      ),
    ).toBe("TP1-0416");
  });

  // Số lượng, ngày mua, link... đều không phải định danh; không có field chữ nào
  // thì thà để trống còn hơn hiện bừa.
  it("trả rỗng khi không có field chữ nào", () => {
    const fields = [
      { name: "SoLuong", typeProperty: TypeProperty.Int },
      { name: "NgayMua", typeProperty: TypeProperty.Date },
    ] as any;

    expect(getRecordLabel({ id: "7", SoLuong: 5 }, fields)).toBe("");
  });

  it("trả rỗng khi field mã không có giá trị", () => {
    expect(getRecordLabel({ id: "7" }, MA_FIELD)).toBe("");
  });

  it("trả rỗng khi chưa có bản ghi hoặc chưa có field", () => {
    expect(getRecordLabel(null, MA_FIELD)).toBe("");
    expect(getRecordLabel({ id: "7", Ma: "PC0015" }, [])).toBe("");
    expect(getRecordLabel({ id: "7", Ma: "PC0015" })).toBe("");
  });
});
