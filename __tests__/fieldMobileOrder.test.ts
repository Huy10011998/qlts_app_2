jest.mock("../src/services/data/httpClient", () => ({ api: {}, callApi: jest.fn() }));
jest.mock("../src/utils/cascade/FetchReferenceByFieldWithParent", () => ({
  fetchReferenceByFieldWithParent: jest.fn(),
}));

import { getFieldActive } from "../src/services/data/commonApi";
import { callApi } from "../src/services/data/httpClient";
import { handleCascadeChange } from "../src/utils/cascade/HandleCascadeChange";
import { fetchReferenceByFieldWithParent } from "../src/utils/cascade/FetchReferenceByFieldWithParent";
import { getMobileOrder, sortByMobileOrder } from "../src/utils/helpers/field";
import { TypeProperty } from "../src/utils/Enum";

// ClassAttributes / FlowAttributes có cột STT_Mobile (.NET trả `stT_Mobile`):
// mobile sắp theo cột này thay cho STT (thứ tự của web).

const callApiMock = callApi as jest.Mock;
const fetchWithParentMock = jest.mocked(fetchReferenceByFieldWithParent);

describe("getMobileOrder / sortByMobileOrder", () => {
  it("lấy STT_Mobile, chưa khai thì lấy stt", () => {
    expect(getMobileOrder({ stt: 1, stT_Mobile: 3 })).toBe(3);
    expect(getMobileOrder({ stt: 4, stT_Mobile: null })).toBe(4);
    expect(getMobileOrder({ stt: 4 })).toBe(4);
  });

  it("trùng số thì giữ thứ tự server trả", () => {
    const sorted = sortByMobileOrder([
      { name: "a", stt: 1, stT_Mobile: 2 },
      { name: "b", stt: 2, stT_Mobile: 1 },
      { name: "c", stt: 3, stT_Mobile: 1 },
    ]);
    expect(sorted.map((f) => f.name)).toEqual(["b", "c", "a"]);
  });
});

describe("getFieldActive", () => {
  beforeEach(() => callApiMock.mockReset());

  it("trả field đã sắp theo STT_Mobile (Máy móc: 2 ảnh lên đầu)", async () => {
    callApiMock.mockResolvedValue({
      success: true,
      data: [
        { name: "HinhAnh1", stt: 1, stT_Mobile: 1 },
        { name: "Ma", stt: 2, stT_Mobile: 3 },
        { name: "MaKT", stt: 3, stT_Mobile: 4 },
        { name: "HinhAnh2", stt: 4, stT_Mobile: 2 },
        { name: "Ten", stt: 5, stT_Mobile: 5 },
      ],
    });

    const res = await getFieldActive("MayMoc");

    expect(res.success).toBe(true);
    expect(res.data.map((f: { name: string }) => f.name)).toEqual([
      "HinhAnh1",
      "HinhAnh2",
      "Ma",
      "MaKT",
      "Ten",
    ]);
  });

  it("data không phải mảng thì trả nguyên", async () => {
    const raw = { success: false, data: null, message: "x" };
    callApiMock.mockResolvedValue(raw);
    await expect(getFieldActive("Khac")).resolves.toBe(raw);
  });
});

describe("handleCascadeChange", () => {
  beforeEach(() => fetchWithParentMock.mockReset());

  it("xoá và nạp lại field con dù con đứng TRƯỚC cha theo STT_Mobile", () => {
    const fieldActive = [
      {
        name: "ID_Room",
        typeProperty: TypeProperty.Reference,
        referenceName: "DM_Room",
        parentsFields: "ID_Building",
      },
      { name: "ID_Building", typeProperty: TypeProperty.Reference, referenceName: "DM_Building" },
    ] as any[];

    let formData: Record<string, any> = { ID_Room: 9, ID_Building: 1 };
    const setFormData = jest.fn((update) => {
      formData = update(formData);
    });

    handleCascadeChange({
      name: "ID_Building",
      value: 2,
      fieldActive,
      setFormData,
      setReferenceData: jest.fn(),
    } as any);

    expect(formData).toEqual({ ID_Room: null, ID_Building: 2 });
    expect(fetchWithParentMock).toHaveBeenCalledWith(
      "DM_Room",
      "ID_Room",
      expect.anything(),
      expect.any(Function),
      { pageSize: 20, skipSize: 0 },
    );
  });
});
