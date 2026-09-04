import {
  buildFieldDefaults,
  getFieldDefault,
} from "../src/utils/form/fieldDefaults";
import { TypeProperty } from "../src/utils/Enum";

const NOW = new Date(2026, 8, 3, 13, 45, 30); // 03/09/2026 13:45:30

const field = (overrides: Record<string, any>) =>
  ({ name: "F", ...overrides }) as any;

describe("default cho Int / Reference / Enum", () => {
  it.each([TypeProperty.Int, TypeProperty.Reference, TypeProperty.Enum])(
    "type %i parse defaultValue ra int thì gán",
    (typeProperty) => {
      expect(
        getFieldDefault(field({ typeProperty, defaultValue: "5" }), NOW),
      ).toEqual({ has: true, value: 5 });
    },
  );

  it("không parse được thì bỏ qua", () => {
    const cases = ["abc", "", "   ", "1.5", "1abc", "true"];

    cases.forEach((defaultValue) => {
      expect(
        getFieldDefault(
          field({ typeProperty: TypeProperty.Int, defaultValue }),
          NOW,
        ).has,
      ).toBe(false);
    });
  });

  it("không khai defaultValue thì bỏ qua", () => {
    expect(
      getFieldDefault(field({ typeProperty: TypeProperty.Reference }), NOW).has,
    ).toBe(false);
  });

  // Ví dụ thật: CongCuDungCu.ID_TienTe (Reference) defaultValue '1' -> 1
  it("ID_TienTe của CongCuDungCu ra 1", () => {
    expect(
      getFieldDefault(
        field({
          name: "ID_TienTe",
          typeProperty: TypeProperty.Reference,
          defaultValue: "1",
        }),
        NOW,
      ),
    ).toEqual({ has: true, value: 1 });
  });
});

describe("default cho Decimal", () => {
  it("parse ra decimal thì gán", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Decimal, defaultValue: "1.5" }),
        NOW,
      ),
    ).toEqual({ has: true, value: 1.5 });
  });

  it("không parse được thì bỏ qua", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Decimal, defaultValue: "abc" }),
        NOW,
      ).has,
    ).toBe(false);
  });
});

describe("default cho Date / Time", () => {
  it("defaultDateNow bật thì gán ngày của thiết bị", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Date, defaultDateNow: true }),
        NOW,
      ),
    ).toEqual({ has: true, value: "03-09-2026" });
  });

  it("defaultTimeNow bật thì gán giờ của thiết bị", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Time, defaultTimeNow: true }),
        NOW,
      ),
    ).toEqual({ has: true, value: "13:45" });
  });

  it("cờ tắt thì bỏ qua", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Date, defaultDateNow: false }),
        NOW,
      ).has,
    ).toBe(false);
    expect(
      getFieldDefault(field({ typeProperty: TypeProperty.Time }), NOW).has,
    ).toBe(false);
  });

  /* BẪY metadata production: nhiều field Date bị copy dòng nên có
     defaultValue = '1' và cả referenceName = 'DM_TienTe'
     (Camera.NgayBaoHanh, DauGhi.NgayKhauHao). Loại Date KHÔNG đọc
     defaultValue nên web bỏ qua — áp vào là ra ngày 01/01/0001. */
  it("Date có defaultValue rác thì KHÔNG áp", () => {
    expect(
      getFieldDefault(
        field({
          name: "NgayBaoHanh",
          typeProperty: TypeProperty.Date,
          defaultValue: "1",
          referenceName: "DM_TienTe",
          defaultDateNow: false,
        }),
        NOW,
      ).has,
    ).toBe(false);
  });

  it("Time có defaultValue rác thì KHÔNG áp", () => {
    expect(
      getFieldDefault(
        field({
          typeProperty: TypeProperty.Time,
          defaultValue: "13:45",
          defaultTimeNow: false,
        }),
        NOW,
      ).has,
    ).toBe(false);
  });

  /* Ngược lại: Int/Reference/Enum/Decimal KHÔNG đọc 2 cờ boolean đó. */
  it("Int có defaultDateNow rác thì không lấy ngày", () => {
    expect(
      getFieldDefault(
        field({ typeProperty: TypeProperty.Int, defaultDateNow: true }),
        NOW,
      ).has,
    ).toBe(false);
  });
});

describe("các loại field không có default", () => {
  /* CongCuDungCu.IsDanMa (Bool) có defaultValue = '1' nhưng web KHÔNG áp
     default cho Bool — áp vào là mobile tick sẵn mà web thì không. */
  it("Bool có defaultValue thì KHÔNG áp", () => {
    expect(
      getFieldDefault(
        field({
          name: "IsDanMa",
          typeProperty: TypeProperty.Bool,
          defaultValue: "1",
        }),
        NOW,
      ).has,
    ).toBe(false);
  });

  it.each([
    TypeProperty.String,
    TypeProperty.Text,
    TypeProperty.Link,
    TypeProperty.Image,
  ])("type %i có defaultValue thì KHÔNG áp", (typeProperty) => {
    expect(
      getFieldDefault(field({ typeProperty, defaultValue: "abc" }), NOW).has,
    ).toBe(false);
  });

  it("typeProperty lạ (List = 11) thì không áp", () => {
    expect(
      getFieldDefault(field({ typeProperty: 11, defaultValue: "1" }), NOW).has,
    ).toBe(false);
  });
});

describe("buildFieldDefaults", () => {
  it("chỉ chứa key của field có default", () => {
    const defaults = buildFieldDefaults(
      [
        field({
          name: "ID_TienTe",
          typeProperty: TypeProperty.Reference,
          defaultValue: "1",
        }),
        field({
          name: "NgayNhap",
          typeProperty: TypeProperty.Date,
          defaultDateNow: true,
        }),
        field({
          name: "Ten",
          typeProperty: TypeProperty.String,
          defaultValue: "abc",
        }),
        field({
          name: "NgayBaoHanh",
          typeProperty: TypeProperty.Date,
          defaultValue: "1",
        }),
      ],
      NOW,
    );

    expect(defaults).toEqual({ ID_TienTe: 1, NgayNhap: "03-09-2026" });
  });

  it("danh sách rỗng hoặc thiếu thì trả object rỗng", () => {
    expect(buildFieldDefaults([], NOW)).toEqual({});
    expect(buildFieldDefaults(undefined as any, NOW)).toEqual({});
  });

  it("bỏ field không có name", () => {
    expect(
      buildFieldDefaults(
        [{ typeProperty: TypeProperty.Int, defaultValue: "5" } as any],
        NOW,
      ),
    ).toEqual({});
  });
});
