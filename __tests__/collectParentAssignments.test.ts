import { collectParentAssignments } from "../src/hooks/AssetAddItem/loadParentValueHelpers";
import { TypeProperty } from "../src/utils/Enum";

jest.mock("../src/services", () => ({
  getDetails: jest.fn(),
  getFieldActive: jest.fn(),
}));

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const FIELDS = [
  {
    name: "ID_Complex",
    typeProperty: TypeProperty.Reference,
    referenceName: "Complex",
  },
  {
    name: "ID_Room",
    typeProperty: TypeProperty.Reference,
    referenceName: "Room",
    parentsFields: "ID_Complex",
  },
  { name: "ID_LoaiThietBiCNTT", typeProperty: TypeProperty.Int },
] as any[];

const collect = (
  parentsFields: string[],
  parentsValues: any[],
  idRoot: number | string = 8,
) =>
  collectParentAssignments({
    parentsFields,
    parentsValues,
    fieldActive: FIELDS,
    idRoot,
    nameClassRoot: "Room",
  });

describe("collectParentAssignments", () => {
  it("prefill giá trị đã parse ra số", () => {
    const { nextFormValues } = collect(
      ["ID_Complex", "ID_Room"],
      ["3", "8"],
    );

    expect(nextFormValues).toEqual({ ID_Complex: 3, ID_Room: 8 });
  });

  /* Spec mục 4: cặp nào parse không ra số thì BỎ QUA (web dùng int.TryParse). */
  it("bỏ cặp không parse ra số nguyên, khỏi cả form và danh sách cần nạp nhãn", () => {
    const { nextFormValues, referenceFieldsToLoad } = collect(
      ["ID_Complex", "ID_Room"],
      ["abc", "8"],
    );

    expect(nextFormValues).toEqual({ ID_Room: 8 });
    expect(referenceFieldsToLoad.map((item) => item.field.name)).toEqual([
      "ID_Room",
    ]);
  });

  it("bỏ cặp có giá trị rỗng hoặc null", () => {
    const { nextFormValues } = collect(
      ["ID_Complex", "ID_Room"],
      ["", null],
    );

    expect(nextFormValues).toEqual({});
  });

  it("bỏ cặp có tên field rỗng", () => {
    const { nextFormValues } = collect(["", "ID_Room"], ["3", "8"]);

    expect(nextFormValues).toEqual({ ID_Room: 8 });
  });

  /* -1 là server cố ý chặn — vẫn prefill để điều kiện lọc đúng ý server. */
  it("giữ giá trị -1", () => {
    const { nextFormValues } = collect(["ID_LoaiThietBiCNTT"], ["-1"]);

    expect(nextFormValues).toEqual({ ID_LoaiThietBiCNTT: -1 });
  });

  it("field Reference vào danh sách nạp nhãn, field Int thì không", () => {
    const { referenceFieldsToLoad } = collect(
      ["ID_LoaiThietBiCNTT", "ID_Complex"],
      ["7", "3"],
    );

    expect(referenceFieldsToLoad.map((item) => item.field.name)).toEqual([
      "ID_Complex",
    ]);
  });

  /* Khoá ngoại tới cha: giá trị trùng `idRoot` nên nhãn tra được ở class cha. */
  it("cặp trỏ về cha thì có fallbackReferenceName là class cha", () => {
    const { referenceFieldsToLoad } = collect(["ID_Room"], ["8"], 8);

    expect(referenceFieldsToLoad[0]).toEqual(
      expect.objectContaining({
        rawValue: 8,
        fallbackReferenceName: "Room",
      }),
    );
  });

  it("cặp không trỏ về cha thì không có fallback", () => {
    const { referenceFieldsToLoad } = collect(["ID_Room"], ["99"], 8);

    expect(referenceFieldsToLoad[0].fallbackReferenceName).toBeUndefined();
  });

  it("field không có trong fieldActive vẫn được prefill", () => {
    const { nextFormValues } = collect(["ID_Unit"], ["98"]);

    expect(nextFormValues).toEqual({ ID_Unit: 98 });
  });
});
