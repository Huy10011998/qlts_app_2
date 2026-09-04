import {
  buildQuickAddPrefill,
  getReadOnlyFieldNames,
  stripReadOnlyFields,
} from "../src/components/assets/shared/assetFormPayload";
import { getParentGate } from "../src/utils/cascade/parentGate";

const fields = [
  { name: "Ma", isReadOnly: true },
  { name: "Ten", isReadOnly: false },
  { name: "NgayTao", isReadOnly: true },
  { name: "ID_Building" },
] as any[];

describe("getReadOnlyFieldNames", () => {
  it("lấy đúng tên field readonly", () => {
    expect(getReadOnlyFieldNames(fields)).toEqual(["Ma", "NgayTao"]);
  });

  it("danh sách rỗng hoặc thiếu thì không nổ", () => {
    expect(getReadOnlyFieldNames([])).toEqual([]);
    expect(getReadOnlyFieldNames(undefined as any)).toEqual([]);
  });
});

describe("stripReadOnlyFields", () => {
  /* Mục 4b: "isReadOnly = true -> web LOẠI field khỏi form thêm / sửa. App nên
     làm giống để không gửi lên field máy tự tính." */
  it("bỏ field readonly khỏi payload", () => {
    const payload = {
      Ma: "CCDC001",
      Ten: "Bàn",
      NgayTao: "03-09-2026",
      ID_Building: 14,
    };

    expect(stripReadOnlyFields(fields, payload)).toEqual({
      Ten: "Bàn",
      ID_Building: 14,
    });
  });

  /* Cột mã tự tăng: giá trị do `tu-dong-tang` sinh, và ví dụ insert ở mục 4 vẫn
     mang cột Ma — nên phải gửi dù metadata khai readonly. */
  it("giữ cột mã tự tăng", () => {
    const payload = { Ma: "CCDC001", Ten: "Bàn", NgayTao: "03-09-2026" };

    expect(stripReadOnlyFields(fields, payload, ["Ma"])).toEqual({
      Ma: "CCDC001",
      Ten: "Bàn",
    });
  });

  /* Mục 4: "gán TẤT CẢ cặp vào entity con", ví dụ insert mang đủ
     ID_Complex/ID_Building/ID_Unit/ID_Room. Loại cột parent-value là bản ghi
     con mất khoá ngoại tới cha. */
  it("giữ cột do parent-value điền dù metadata khai readonly", () => {
    const withReadOnlyFk = [
      ...fields,
      { name: "ID_Room", isReadOnly: true },
    ] as any[];
    const payload = { Ma: "BCC0125", ID_Room: 8, Ten: "Bình MFZ4" };

    expect(
      stripReadOnlyFields(withReadOnlyFk, payload, ["Ma", "ID_Room"]),
    ).toEqual(payload);
  });

  it("không sửa payload gốc", () => {
    const payload = { Ma: "CCDC001", Ten: "Bàn" };
    stripReadOnlyFields(fields, payload);

    expect(payload.Ma).toBe("CCDC001");
  });

  it("keepFields có undefined/null thì bỏ qua, không giữ oan", () => {
    const payload = { Ma: "CCDC001", Ten: "Bàn" };

    expect(stripReadOnlyFields(fields, payload, [undefined, null])).toEqual({
      Ten: "Bàn",
    });
  });
});

describe("buildQuickAddPrefill", () => {
  const gate = (formData: Record<string, any>) =>
    getParentGate({ name: "ID_Room", parentsFields: "A,B,C" } as any, formData);

  it("đủ cấp cha thì dựng cặp field = id kèm nhãn", () => {
    const result = buildQuickAddPrefill(
      gate({ A: 3, B: 14, C: 98 }),
      { A: 3, A_MoTa: "Khu 3", B: 14, C: 98 },
    );

    expect(result.values).toEqual({ A: 3, B: 14, C: 98 });
    expect(result.labels).toEqual({ A: "Khu 3" });
  });

  /* Prefill nửa vời là bản ghi mới thuộc sai cha, mà lưu được và không báo gì. */
  it("thiếu cấp cha thì không prefill gì", () => {
    const result = buildQuickAddPrefill(gate({ A: 3, C: 98 }), { A: 3 });

    expect(result.values).toEqual({});
    expect(result.labels).toEqual({});
  });

  it("field không có ở class đích thì bỏ", () => {
    const result = buildQuickAddPrefill(
      gate({ A: 3, B: 14, C: 98 }),
      {},
      [{ name: "B" }, { name: "C" }] as any,
    );

    expect(result.values).toEqual({ B: 14, C: 98 });
  });

  it("field không khai cấp cha thì không prefill", () => {
    const noParents = getParentGate({ name: "ID_X" } as any, {});

    expect(buildQuickAddPrefill(noParents, {}).values).toEqual({});
    expect(buildQuickAddPrefill(null, {}).values).toEqual({});
  });
});
