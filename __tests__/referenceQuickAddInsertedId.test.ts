import { extractInsertedId } from "../src/components/assets/shared/ReferenceQuickAddForm";

/**
 * `insert` chưa từng được nơi nào đọc giá trị trả về, nên hình dạng response là
 * phần không chắc nhất của luồng thêm nhanh. Khoá lại các dạng đã tính tới, và
 * quan trọng hơn: khoá luôn việc KHÔNG bịa ra id khi không lần được — lúc đó
 * picker chỉ tải lại danh sách chứ không chọn bừa một bản ghi.
 */
describe("extractInsertedId", () => {
  it("đọc được id từ các dạng response hay gặp", () => {
    expect(extractInsertedId({ data: { entities: [{ id: 12 }] } })).toBe(12);
    expect(extractInsertedId({ data: [{ id: 34 }] })).toBe(34);
    expect(extractInsertedId({ data: { id: 56 } })).toBe(56);
    expect(extractInsertedId({ data: 78 })).toBe(78);
    expect(extractInsertedId({ data: ["90"] })).toBe(90);
  });

  it("trả null khi response không mang id dùng được", () => {
    expect(extractInsertedId(undefined)).toBeNull();
    expect(extractInsertedId({ data: null })).toBeNull();
    expect(extractInsertedId({ data: { message: "OK" } })).toBeNull();
    expect(extractInsertedId({ data: { entities: [] } })).toBeNull();
    // Id 0 không phải bản ghi thật — đừng chọn nó.
    expect(extractInsertedId({ data: { id: 0 } })).toBeNull();
  });
});
