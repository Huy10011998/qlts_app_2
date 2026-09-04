import { loadReferenceItemsForField } from "../src/hooks/AssetAddItem/referenceLoaderHelpers";
import { fetchReferenceByField } from "../src/utils/fetchField/FetchReferenceField";
import { fetchReferenceByFieldWithParent } from "../src/utils/cascade/FetchReferenceByFieldWithParent";
import { TypeProperty } from "../src/utils/Enum";

jest.mock("../src/utils/fetchField/FetchReferenceField", () => ({
  fetchReferenceByField: jest.fn(),
}));

jest.mock("../src/utils/cascade/FetchReferenceByFieldWithParent", () => ({
  fetchReferenceByFieldWithParent: jest.fn(),
}));

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockedWithParent = jest.mocked(fetchReferenceByFieldWithParent);
const mockedPlain = jest.mocked(fetchReferenceByField);

const field = (parentsFields?: string) =>
  ({
    name: "ID_Room",
    moTa: "Phòng",
    typeProperty: TypeProperty.Reference,
    referenceName: "Room",
    parentsFields,
  }) as any;

const setReferenceData = jest.fn();

beforeEach(() => {
  mockedWithParent.mockReset().mockResolvedValue({ items: [], totalCount: 0 });
  mockedPlain.mockReset().mockResolvedValue({ items: [], totalCount: 0 });
});

describe("loadReferenceItemsForField", () => {
  it("đủ cấp cha thì gửi lstParent đúng thứ tự khai", async () => {
    await loadReferenceItemsForField({
      field: field("ID_Complex,ID_Building,ID_Unit"),
      // Thứ tự key khác thứ tự khai — không được ảnh hưởng.
      formData: { ID_Unit: 98, ID_Complex: 3, ID_Building: 14 },
      setReferenceData,
    });

    expect(mockedWithParent).toHaveBeenCalledWith(
      "Room",
      "ID_Room",
      "3,14,98",
      setReferenceData,
      undefined,
    );
  });

  /* Đây là chốt chính của mục 8b: thiếu vế thì chuỗi lstParent bị nối thẳng vào
     SelectSql -> lỗi SQL 500, hoặc khớp sai dòng có cấp cuối NULL. */
  it("thiếu cấp cha thì KHÔNG gọi API nào", async () => {
    const onMissingParents = jest.fn();

    const result = await loadReferenceItemsForField({
      field: field("ID_Complex,ID_Building"),
      formData: { ID_Complex: 3 },
      setReferenceData,
      onMissingParents,
    });

    expect(result).toBe(false);
    expect(mockedWithParent).not.toHaveBeenCalled();
    expect(mockedPlain).not.toHaveBeenCalled();
  });

  /* `alertOnMissingParents` chỉ quyết định có BÁO cho người dùng hay không —
     việc chặn API là vô điều kiện. Trước đây cờ này (tên cũ
     `requireAllParents`) mặc định false nên các màn gọi hụt vẫn bắn API. */
  it("cờ alert không bật thì vẫn chặn, chỉ là không báo", async () => {
    const onMissingParents = jest.fn();

    await loadReferenceItemsForField({
      field: field("ID_Complex,ID_Building"),
      formData: {},
      setReferenceData,
      alertOnMissingParents: false,
      onMissingParents,
    });

    expect(mockedWithParent).not.toHaveBeenCalled();
    expect(onMissingParents).not.toHaveBeenCalled();
  });

  it("bật cờ alert thì báo kèm danh sách cấp còn thiếu", async () => {
    const onMissingParents = jest.fn();

    await loadReferenceItemsForField({
      field: field("ID_Complex,ID_Building"),
      formData: { ID_Complex: 3 },
      setReferenceData,
      alertOnMissingParents: true,
      onMissingParents,
    });

    expect(onMissingParents).toHaveBeenCalledWith(
      expect.objectContaining({ missingFields: ["ID_Building"] }),
    );
  });

  it("giá trị cha không parse ra số nguyên thì coi là thiếu", async () => {
    await loadReferenceItemsForField({
      field: field("ID_Complex"),
      formData: { ID_Complex: "abc" },
      setReferenceData,
    });

    expect(mockedWithParent).not.toHaveBeenCalled();
  });

  it("cha có id 0 vẫn coi là đủ", async () => {
    await loadReferenceItemsForField({
      field: field("ID_Complex"),
      formData: { ID_Complex: 0 },
      setReferenceData,
    });

    expect(mockedWithParent).toHaveBeenCalledWith(
      "Room",
      "ID_Room",
      "0",
      setReferenceData,
      undefined,
    );
  });

  it("field không khai cấp cha thì gọi nhánh không lstParent", async () => {
    await loadReferenceItemsForField({
      field: field(undefined),
      formData: {},
      setReferenceData,
    });

    expect(mockedPlain).toHaveBeenCalledWith(
      "Room",
      "ID_Room",
      setReferenceData,
      undefined,
    );
    expect(mockedWithParent).not.toHaveBeenCalled();
  });

  it("field không có referenceName thì không gọi gì", async () => {
    const result = await loadReferenceItemsForField({
      field: { name: "X", typeProperty: TypeProperty.Reference } as any,
      formData: {},
      setReferenceData,
    });

    expect(result).toBeNull();
    expect(mockedPlain).not.toHaveBeenCalled();
  });
});
