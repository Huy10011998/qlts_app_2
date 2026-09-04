import {
  buildParentConditions,
  buildParentValuePayload,
  buildReferenceOnlyConditions,
  mergeReferenceCondition,
  parseParentIntValue,
} from "../src/hooks/parentValue/parentValueHelpers";
import { SqlOperator, TypeProperty } from "../src/utils/Enum";

describe("parseParentIntValue", () => {
  it("nhận số nguyên dạng số và dạng chuỗi", () => {
    expect(parseParentIntValue(8)).toBe(8);
    expect(parseParentIntValue("8")).toBe(8);
    expect(parseParentIntValue(" 8 ")).toBe(8);
    expect(parseParentIntValue(0)).toBe(0);
  });

  /* -1 là server CỐ Ý chặn (cặp cha-con không được phép hiện dữ liệu). Gửi
     nguyên -1 thì get-list trả rỗng — đúng ý. Bỏ đi là làm điều kiện rộng ra. */
  it("giữ -1", () => {
    expect(parseParentIntValue(-1)).toBe(-1);
    expect(parseParentIntValue("-1")).toBe(-1);
  });

  it("loại giá trị không parse ra số nguyên", () => {
    expect(parseParentIntValue(null)).toBeNull();
    expect(parseParentIntValue(undefined)).toBeNull();
    expect(parseParentIntValue("")).toBeNull();
    expect(parseParentIntValue("abc")).toBeNull();
    expect(parseParentIntValue("1.5")).toBeNull();
    expect(parseParentIntValue(true)).toBeNull();
  });
});

describe("buildParentValuePayload", () => {
  // BE đổi tên 3 field từ 03/09/2026; gửi cả hai bộ để môi trường nào cũng bind ra.
  it("gửi cả tên mới và tên cũ, map đúng vai", () => {
    const payload = buildParentValuePayload(8, "Room", "BinhChuaChay");

    expect(payload).toEqual({
      ID_ParentClass: 8,
      Name_ParentClass: "Room",
      Name_ReferencesClass: "BinhChuaChay",
      idClass: 8,
      nameClass: "Room",
      nameReference: "BinhChuaChay",
    });
  });
});

describe("buildParentConditions", () => {
  it("đổi trọn bộ cặp thành Conditions Equals kiểu Int", () => {
    const conditions = buildParentConditions(
      ["ID_Complex", "ID_Building", "ID_Unit", "ID_Room"],
      ["3", "14", "98", "8"],
    );

    expect(conditions).toEqual([
      {
        property: "ID_Complex",
        operator: SqlOperator.Equals,
        value: "3",
        type: TypeProperty.Int,
      },
      {
        property: "ID_Building",
        operator: SqlOperator.Equals,
        value: "14",
        type: TypeProperty.Int,
      },
      {
        property: "ID_Unit",
        operator: SqlOperator.Equals,
        value: "98",
        type: TypeProperty.Int,
      },
      {
        property: "ID_Room",
        operator: SqlOperator.Equals,
        value: "8",
        type: TypeProperty.Int,
      },
    ]);
  });

  /* Ca LinhKien: cha là MayTinh thì kèm ID_LoaiThietBiCNTT = 7. Bỏ cặp phân
     loại này là danh sách lẫn cả linh kiện của Server (giá trị 8). */
  it("giữ cả cặp điều kiện phân loại, không chỉ khoá ngoại tới cha", () => {
    const conditions = buildParentConditions(
      ["ID_LoaiThietBiCNTT", "ID_ThietBiCNTT"],
      ["7", "1234"],
    );

    expect(conditions.map((item) => item.property)).toEqual([
      "ID_LoaiThietBiCNTT",
      "ID_ThietBiCNTT",
    ]);
  });

  it("giữ cặp giá trị -1", () => {
    const conditions = buildParentConditions(["ID_LoaiThietBiCNTT"], ["-1"]);

    expect(conditions).toHaveLength(1);
    expect(conditions[0].value).toBe("-1");
  });

  /* Cặp vế rỗng sinh câu SQL què (dạng "[ID_Room] = ") -> 500 hoặc danh sách
     rỗng không rõ lý do. Server không tự bỏ nên app phải lọc. */
  it("bỏ cặp có tên field rỗng", () => {
    const conditions = buildParentConditions(
      ["", "   ", "ID_Room"],
      ["3", "14", "8"],
    );

    expect(conditions.map((item) => item.property)).toEqual(["ID_Room"]);
  });

  it("bỏ cặp có giá trị không parse ra số", () => {
    const conditions = buildParentConditions(
      ["A", "B", "C", "D", "E"],
      ["", null, "abc", "1.5", "8"],
    );

    expect(conditions.map((item) => item.property)).toEqual(["E"]);
  });

  it("parentsValues ngắn hơn parentsFields thì bỏ phần thiếu, không nổ", () => {
    const conditions = buildParentConditions(["A", "B", "C"], ["3"]);

    expect(conditions.map((item) => item.property)).toEqual(["A"]);
  });

  it("input không phải mảng thì trả mảng rỗng", () => {
    expect(buildParentConditions(undefined, undefined)).toEqual([]);
    expect(buildParentConditions(null, ["3"])).toEqual([]);
    expect(buildParentConditions("ID_Room", "8")).toEqual([]);
  });

  // Spec: ConditionReferences khai 2 dòng cùng field thì gửi cả 2 vẫn đúng.
  it("không dedupe cặp trùng tên field", () => {
    const conditions = buildParentConditions(["A", "A"], ["3", "3"]);

    expect(conditions).toHaveLength(2);
  });
});

describe("mergeReferenceCondition", () => {
  it("thêm khoá ngoại tới cha khi bộ cặp thiếu", () => {
    const conditions = mergeReferenceCondition(
      buildParentConditions(["ID_Complex"], ["3"]),
      "ID_Room",
      8,
    );

    expect(conditions.map((item) => item.property)).toEqual([
      "ID_Complex",
      "ID_Room",
    ]);
  });

  it("không nhân đôi khi bộ cặp đã có, kể cả khác hoa thường", () => {
    const conditions = mergeReferenceCondition(
      buildParentConditions(["id_room"], ["8"]),
      "ID_Room",
      8,
    );

    expect(conditions).toHaveLength(1);
  });

  it("thiếu propertyReference hoặc idRoot thì giữ nguyên", () => {
    const base = buildParentConditions(["ID_Complex"], ["3"]);

    expect(mergeReferenceCondition(base, undefined, 8)).toEqual(base);
    expect(mergeReferenceCondition(base, "ID_Room", undefined)).toEqual(base);
    expect(mergeReferenceCondition(base, "ID_Room", "abc")).toEqual(base);
  });
});

describe("buildReferenceOnlyConditions", () => {
  it("dựng đúng điều kiện lọc kiểu cũ để làm fallback", () => {
    expect(buildReferenceOnlyConditions("ID_Room", 8)).toEqual([
      {
        property: "ID_Room",
        operator: SqlOperator.Equals,
        value: "8",
        type: TypeProperty.Int,
      },
    ]);
  });

  it("thiếu tham số thì không dựng điều kiện nào", () => {
    expect(buildReferenceOnlyConditions(undefined, undefined)).toEqual([]);
  });
});
