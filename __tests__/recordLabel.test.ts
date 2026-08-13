import { getRecordLabel } from "../src/components/assets/detailActions/useAssetRecordActions";

// Field của tài sản là động theo cấu hình class, không có key `code` cố định,
// nên định danh lấy từ field đầu tiên đang hiển thị.
const MA_FIELD = [{ name: "Ma", typeProperty: 1 }] as any;

describe("định danh bản ghi", () => {
  it("lấy giá trị field đầu tiên", () => {
    expect(getRecordLabel({ id: "7", Ma: "PC0015" }, MA_FIELD)).toBe("PC0015");
  });

  it("trả rỗng khi field đầu không có giá trị", () => {
    expect(getRecordLabel({ id: "7" }, MA_FIELD)).toBe("");
  });

  it("trả rỗng khi chưa có bản ghi hoặc chưa có field", () => {
    expect(getRecordLabel(null, MA_FIELD)).toBe("");
    expect(getRecordLabel({ id: "7", Ma: "PC0015" }, [])).toBe("");
    expect(getRecordLabel({ id: "7", Ma: "PC0015" })).toBe("");
  });
});
