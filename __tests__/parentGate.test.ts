import {
  getParentGate,
  getParentGateMessage,
  parseParentFieldNames,
  toParentId,
} from "../src/utils/cascade/parentGate";

const field = (parentsFields?: string) =>
  ({ name: "ID_Room", parentsFields }) as any;

describe("toParentId", () => {
  it("nhận số và chuỗi số, kể cả có khoảng trắng", () => {
    expect(toParentId(5)).toBe(5);
    expect(toParentId("5")).toBe(5);
    expect(toParentId(" 5 ")).toBe(5);
  });

  // Mấy chỗ code cũ dùng `every((p) => formData[p])` nên coi id 0 là thiếu cha.
  it("id 0 là hợp lệ", () => {
    expect(toParentId(0)).toBe(0);
    expect(toParentId("0")).toBe(0);
  });

  it("loại giá trị không phải số nguyên dương", () => {
    expect(toParentId(null)).toBeNull();
    expect(toParentId(undefined)).toBeNull();
    expect(toParentId("")).toBeNull();
    expect(toParentId("   ")).toBeNull();
    expect(toParentId("abc")).toBeNull();
    expect(toParentId("1.5")).toBeNull();
    expect(toParentId("1abc")).toBeNull();
    expect(toParentId(NaN)).toBeNull();
    expect(toParentId(true)).toBeNull();
  });

  // -1 là cờ server cố ý chặn ở parent-value, không phải id để đi lọc danh mục.
  it("loại số âm", () => {
    expect(toParentId(-1)).toBeNull();
    expect(toParentId("-3")).toBeNull();
  });
});

describe("parseParentFieldNames", () => {
  it("tách theo dấu phẩy và bỏ khoảng trắng", () => {
    expect(parseParentFieldNames("ID_Complex, ID_Building ,ID_Unit")).toEqual([
      "ID_Complex",
      "ID_Building",
      "ID_Unit",
    ]);
  });

  it("chuỗi rỗng hoặc không phải chuỗi thì ra mảng rỗng", () => {
    expect(parseParentFieldNames("")).toEqual([]);
    expect(parseParentFieldNames(undefined)).toEqual([]);
    expect(parseParentFieldNames(null)).toEqual([]);
  });
});

describe("getParentGate", () => {
  it("đủ mọi cấp thì nối lstParent theo đúng thứ tự khai", () => {
    const gate = getParentGate(field("ID_Complex,ID_Building,ID_Unit"), {
      // Thứ tự key trong formData khác thứ tự khai — không được ảnh hưởng.
      ID_Unit: 7,
      ID_Complex: 3,
      ID_Building: 14,
    });

    expect(gate.isReady).toBe(true);
    expect(gate.lstParent).toBe("3,14,7");
    expect(gate.ids).toEqual([3, 14, 7]);
    expect(gate.missingFields).toEqual([]);
  });

  /* Đây là bug đã có: code cũ filter bỏ cấp thiếu RỒI mới join, nên gửi
     "<B>,<C>" mà server hiểu là cấp 1,2 -> khớp sai, user chọn vào là lưu sai. */
  it("thiếu cấp đầu thì KHÔNG được sinh chuỗi lệch vị trí", () => {
    const gate = getParentGate(field("A,B,C"), { B: 14, C: 7 });

    expect(gate.isReady).toBe(false);
    expect(gate.lstParent).toBeNull();
    expect(gate.lstParent).not.toBe("14,7");
    expect(gate.missingFields).toEqual(["A"]);
  });

  it("thiếu cấp giữa thì báo đúng cấp thiếu", () => {
    const gate = getParentGate(field("A,B,C"), { A: 3, C: 7 });

    expect(gate.isReady).toBe(false);
    expect(gate.lstParent).toBeNull();
    expect(gate.missingFields).toEqual(["B"]);
  });

  // "3,14," -> không lỗi nhưng trả về các dòng có cấp cuối NULL.
  it("thiếu cấp cuối thì KHÔNG được sinh chuỗi thiếu vế", () => {
    const gate = getParentGate(field("A,B,C"), { A: 3, B: 14 });

    expect(gate.lstParent).toBeNull();
    expect(gate.lstParent).not.toBe("3,14,");
  });

  // "1," -> lỗi SQL "Conversion failed ... to data type int" (API 500).
  it("cấu hình 1 cấp mà thiếu thì cũng chặn", () => {
    const gate = getParentGate(field("ID_Complex"), {});

    expect(gate.isReady).toBe(false);
    expect(gate.lstParent).toBeNull();
  });

  it("cha có id 0 vẫn coi là đủ", () => {
    const gate = getParentGate(field("A,B"), { A: 0, B: 14 });

    expect(gate.isReady).toBe(true);
    expect(gate.lstParent).toBe("0,14");
  });

  it("giá trị cha không parse ra số thì coi là thiếu", () => {
    const gate = getParentGate(field("A,B"), { A: "abc", B: 14 });

    expect(gate.isReady).toBe(false);
    expect(gate.missingFields).toEqual(["A"]);
  });

  it("field không khai parentsFields thì mở, lstParent rỗng", () => {
    const gate = getParentGate(field(undefined), {});

    expect(gate.hasParents).toBe(false);
    expect(gate.isReady).toBe(true);
    expect(gate.lstParent).toBe("");
  });

  it("formData rỗng hoặc thiếu thì không nổ", () => {
    expect(getParentGate(field("A"), undefined).isReady).toBe(false);
    expect(getParentGate(null, {}).hasParents).toBe(false);
  });
});

describe("getParentGateMessage", () => {
  it("dùng nhãn moTa của field cha nếu có", () => {
    const gate = getParentGate(field("ID_Building,ID_Unit"), {});
    const fieldActive = [
      { name: "ID_Building", moTa: "Toà nhà" },
      { name: "ID_Unit", moTa: "Tầng" },
    ] as any;

    expect(getParentGateMessage(gate, fieldActive)).toBe(
      "Vui lòng chọn Toà nhà, Tầng trước",
    );
  });

  it("không có nhãn thì dùng tên cột", () => {
    const gate = getParentGate(field("ID_Building"), {});

    expect(getParentGateMessage(gate)).toBe("Vui lòng chọn ID_Building trước");
  });

  it("đủ cha thì không có câu nhắc", () => {
    const gate = getParentGate(field("A"), { A: 1 });

    expect(getParentGateMessage(gate)).toBe("");
  });
});
