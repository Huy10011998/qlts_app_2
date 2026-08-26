import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useAddChildShortcut } from "../src/components/assets/shared/useAddChildShortcut";
import {
  getClassReference,
  getFieldActive,
  getPropertyClass,
} from "../src/services";

const mockNavigate = jest.fn();
const mockShowAlert = jest.fn();
let mockAllowedInsertClasses: string[] = [];

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../src/services", () => ({
  getClassReference: jest.fn(),
  getFieldActive: jest.fn(),
  getPropertyClass: jest.fn(),
}));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    can: (nameClass: string, action: string) =>
      action === "Insert" && mockAllowedInsertClasses.includes(nameClass),
    loaded: true,
  }),
}));

jest.mock("../src/hooks/useSafeAlert", () => ({
  useSafeAlert: () => ({
    isMounted: () => true,
    showAlertIfActive: mockShowAlert,
  }),
}));

jest.mock("../src/utils/Logger", () => ({ error: jest.fn(), log: jest.fn() }));

const mockedGetClassReference = jest.mocked(getClassReference);
const mockedGetFieldActive = jest.mocked(getFieldActive);
const mockedGetPropertyClass = jest.mocked(getPropertyClass);

// Field đầu tiên là mã tài sản — hook lấy nó làm `rootRecordLabel`.
const FIELD_ACTIVE = [{ name: "Ma", typeProperty: 1 }] as any;
const PARENT_ITEM = { id: 7, Ma: "PC0015" };

const CHILD_CLASSES = [
  {
    id: "1",
    name: "Asset_PC_LinhKien",
    moTa: "Linh kiện",
    propertyReference: "iD_PC",
    iconMobile: null,
  },
  {
    id: "2",
    name: "Asset_PC_BaoTri",
    moTa: "Bảo trì",
    propertyReference: "iD_PC",
    iconMobile: null,
  },
];

type HookResult = ReturnType<typeof useAddChildShortcut>;

function Harness({ onRender }: { onRender: (result: HookResult) => void }) {
  onRender(
    useAddChildShortcut({
      fieldActive: FIELD_ACTIVE,
      nameClass: "Asset_PC",
      groupMenuId: 3,
      viewPermission: "View_PC",
      assetTitleHeader: "Tài sản",
    }),
  );
  return null;
}

const mount = async () => {
  let latest: HookResult | undefined;
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Harness
        onRender={(result) => {
          latest = result;
        }}
      />,
    );
  });

  return {
    get result() {
      return latest!;
    },
    unmount: async () =>
      ReactTestRenderer.act(async () => {
        tree!.unmount();
      }),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAllowedInsertClasses = CHILD_CLASSES.map((child) => child.name);
  mockedGetClassReference.mockResolvedValue({ data: CHILD_CLASSES } as any);
  mockedGetFieldActive.mockResolvedValue({
    data: [{ name: "MaLinhKien", typeProperty: 1 }],
  } as any);
  mockedGetPropertyClass.mockResolvedValue({
    data: { prefix: "LK", isTuDongTang: true },
  } as any);
});

describe("useAddChildShortcut", () => {
  it("vào thẳng màn thêm mới khi chỉ có một danh mục con được phép", async () => {
    mockAllowedInsertClasses = ["Asset_PC_BaoTri"];
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.openFor(PARENT_ITEM);
    });

    expect(harness.result.sheetProps.visible).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(
      "AssetAddRelatedItem",
      expect.objectContaining({
        nameClass: "Asset_PC_BaoTri",
        idRoot: "7",
        nameClassRoot: "Asset_PC",
        propertyReference: "iD_PC",
        rootRecordLabel: "PC0015",
        returnTo: "openAssetRelatedList",
        titleHeader: "Bảo trì",
        groupMenuId: 3,
        viewPermission: "View_PC",
        assetTitleHeader: "Tài sản",
      }),
    );
    // Field truyền sang màn tạo phải là field của class con, không phải của cha.
    expect(
      JSON.parse(mockNavigate.mock.calls[0][1].field),
    ).toEqual([{ name: "MaLinhKien", typeProperty: 1 }]);

    await harness.unmount();
  });

  it("mở bảng chọn khi có nhiều danh mục con rồi điều hướng theo lựa chọn", async () => {
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.openFor(PARENT_ITEM);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(harness.result.sheetProps.visible).toBe(true);
    expect(harness.result.sheetProps.recordLabel).toBe("PC0015");
    expect(harness.result.sheetProps.items.map((item) => item.name)).toEqual([
      "Asset_PC_LinhKien",
      "Asset_PC_BaoTri",
    ]);

    await ReactTestRenderer.act(async () => {
      harness.result.sheetProps.onSelect(harness.result.sheetProps.items[1]);
    });

    expect(harness.result.sheetProps.visible).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(
      "AssetAddRelatedItem",
      expect.objectContaining({ nameClass: "Asset_PC_BaoTri", idRoot: "7" }),
    );

    await harness.unmount();
  });

  it("chỉ gọi getClassReference một lần cho cùng class cha", async () => {
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.openFor(PARENT_ITEM);
    });
    await ReactTestRenderer.act(async () => {
      harness.result.sheetProps.onClose();
    });
    await ReactTestRenderer.act(async () => {
      await harness.result.openFor({ id: 8, Ma: "PC0016" });
    });

    expect(mockedGetClassReference).toHaveBeenCalledTimes(1);

    await harness.unmount();
  });

  it("báo lỗi và không điều hướng khi không có quyền thêm ở danh mục con nào", async () => {
    mockAllowedInsertClasses = [];
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.openFor(PARENT_ITEM);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(harness.result.sheetProps.visible).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith(
      "Thông báo",
      expect.stringContaining("không có danh mục con"),
    );

    await harness.unmount();
  });

  it("gọi tên việc theo class con khi chỉ có một danh mục", async () => {
    mockAllowedInsertClasses = ["Asset_PC_BaoTri"];
    const harness = await mount();

    expect(harness.result.actionLabel).toBe("Thêm bảo trì");
    expect(harness.result.actionIcon).toBe("add-circle-outline");
    expect(harness.result.canAddChild).toBe(true);

    await harness.unmount();
  });

  it("nhãn là Đánh giá với class DanhGia_*", async () => {
    mockedGetClassReference.mockResolvedValue({
      data: [
        {
          id: "9",
          name: "DanhGia_BinhChuaChay",
          moTa: "Đánh giá bình chữa cháy",
          propertyReference: "iD_BinhChuaChay",
          iconMobile: null,
        },
      ],
    } as any);
    mockAllowedInsertClasses = ["DanhGia_BinhChuaChay"];
    const harness = await mount();

    expect(harness.result.actionLabel).toBe("Đánh giá");
    expect(harness.result.actionIcon).toBe("clipboard-outline");

    await harness.unmount();
  });

  it("nhãn chung khi có nhiều danh mục con", async () => {
    const harness = await mount();

    expect(harness.result.actionLabel).toBe("Thêm mục con");
    expect(harness.result.canAddChild).toBe(true);

    await harness.unmount();
  });

  it("ẩn nút vuốt và dải chỉ dẫn khi không có danh mục con nào được thêm", async () => {
    mockAllowedInsertClasses = [];
    const harness = await mount();

    expect(harness.result.canAddChild).toBe(false);
    expect(harness.result.hasChildClasses).toBe(false);

    await harness.unmount();
  });

  // Lỗi mạng lúc prefetch: vẫn cho bấm để thử lại, nhưng không hứa bằng dải chỉ
  // dẫn khi chưa biết class này có mục con hay không.
  it("giữ nút nhưng ẩn dải chỉ dẫn khi chưa tải được danh mục con", async () => {
    mockedGetClassReference.mockRejectedValue(new Error("offline"));
    const harness = await mount();

    expect(harness.result.canAddChild).toBe(true);
    expect(harness.result.hasChildClasses).toBe(false);
    expect(harness.result.actionLabel).toBe("Thêm mục con");

    await harness.unmount();
  });

  it("báo lỗi khi tải cấu hình class con thất bại", async () => {
    mockAllowedInsertClasses = ["Asset_PC_BaoTri"];
    mockedGetFieldActive.mockRejectedValue(new Error("timeout"));
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.openFor(PARENT_ITEM);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      "Lỗi",
      expect.stringContaining("Bảo trì"),
    );
    expect(harness.result.busyItemId).toBeNull();

    await harness.unmount();
  });
});
