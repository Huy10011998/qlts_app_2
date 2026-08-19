import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useAssetRecordActions } from "../src/components/assets/detailActions/useAssetRecordActions";
import { checkReferenceUsage, deleteItems } from "../src/services/data/callApi";

const mockRoute = { name: "AssetDetails", params: {} as any };
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockShowAlert = jest.fn();
let mockAllowedActions: string[] = [];
let mockUpdatedListItem: { id: string; nameClass: string } | null = null;
const mockDispatch = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: any) => unknown) =>
    selector({ asset: { updatedListItem: mockUpdatedListItem } }),
}));

jest.mock("../src/services/data/callApi", () => ({
  checkReferenceUsage: jest.fn(),
  deleteItems: jest.fn(),
}));

jest.mock("../src/hooks/useParams", () => ({ useParams: () => ({}) }));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    can: (_nameClass: string, action: string) =>
      mockAllowedActions.includes(action),
  }),
}));

jest.mock("../src/hooks/useSafeAlert", () => ({
  useSafeAlert: () => ({ showAlertIfActive: mockShowAlert }),
}));

jest.mock("../src/utils/Logger", () => ({ error: jest.fn() }));

const mockedCheckReference = jest.mocked(checkReferenceUsage);
const mockedDeleteItems = jest.mocked(deleteItems);

// Field đầu tiên là mã tài sản — dùng để nêu định danh trong câu xác nhận xoá.
const FIELD_ACTIVE = [{ name: "Ma", typeProperty: 1 }] as any;
const ITEM = { id: "7", Ma: "PC0015" };

type HookResult = ReturnType<typeof useAssetRecordActions>;

function Harness({ onRender }: { onRender: (result: HookResult) => void }) {
  onRender(
    useAssetRecordActions({
      item: ITEM,
      nameClass: "Asset_PC",
      fieldActive: FIELD_ACTIVE,
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
  mockRoute.name = "AssetDetails";
  mockAllowedActions = ["Update", "Delete", "Insert"];
  mockUpdatedListItem = null;
});

/** Bấm nút trong alert vừa hiện (nút cuối là nút hành động). */
const pressLastAlertButton = async () => {
  const buttons = mockShowAlert.mock.calls.at(-1)?.[2] as
    | Array<{ onPress?: () => void }>
    | undefined;

  await ReactTestRenderer.act(async () => {
    buttons?.at(-1)?.onPress?.();
  });
};

const dispatchedTypes = () =>
  mockDispatch.mock.calls.map(([action]) => action?.type);

describe("useAssetRecordActions", () => {
  it("cho phép cả ba hành động khi đủ quyền", async () => {
    const harness = await mount();

    expect(harness.result.allowEdit).toBe(true);
    expect(harness.result.allowDelete).toBe(true);
    expect(harness.result.allowClone).toBe(true);

    await harness.unmount();
  });

  it("ẩn từng hành động theo quyền còn thiếu", async () => {
    mockAllowedActions = ["Update"];
    const harness = await mount();

    expect(harness.result.allowEdit).toBe(true);
    expect(harness.result.allowDelete).toBe(false);
    expect(harness.result.allowClone).toBe(false);

    await harness.unmount();
  });

  // Vào chi tiết từ quét QR là để tra một mã cụ thể, nhân bản ở đó vô nghĩa.
  it("không cho Bản sao ở màn chi tiết QR dù có quyền Insert", async () => {
    mockRoute.name = "QrDetails";
    const harness = await mount();

    expect(harness.result.allowClone).toBe(false);
    expect(harness.result.allowDelete).toBe(true);

    await harness.unmount();
  });

  it("chặn xoá khi bản ghi đang được tham chiếu", async () => {
    mockedCheckReference.mockResolvedValue({
      data: [{ message: "Phiếu bàn giao #12" }],
    } as any);
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.onDelete();
    });

    expect(mockedDeleteItems).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      "Không thể xóa thông tin",
      expect.stringContaining("Phiếu bàn giao #12"),
    );

    await harness.unmount();
  });

  it("nêu mã tài sản trong câu xác nhận xoá", async () => {
    mockedCheckReference.mockResolvedValue({ data: [] } as any);
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.onDelete();
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      "Xác nhận xoá",
      expect.stringContaining("PC0015"),
      expect.any(Array),
      expect.any(Object),
    );
    expect(mockedDeleteItems).not.toHaveBeenCalled();

    await harness.unmount();
  });

  // Sửa bản ghi xong là có cờ "nạp lại đúng item này"; xoá luôn bản ghi đó mà
  // không dọn cờ thì danh sách gọi get-details cho một id không còn tồn tại và ăn
  // 404 ở lần focus sau.
  it("dọn cờ nạp lại item khi xoá đúng bản ghi đang treo cờ", async () => {
    mockUpdatedListItem = { id: "7", nameClass: "Asset_PC" };
    mockedCheckReference.mockResolvedValue({ data: [] } as any);
    mockedDeleteItems.mockResolvedValue({} as any);
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.onDelete();
    });
    await pressLastAlertButton(); // Xác nhận xoá → gọi API xoá
    await pressLastAlertButton(); // OK ở thông báo thành công

    expect(mockedDeleteItems).toHaveBeenCalled();
    expect(dispatchedTypes()).toContain("asset/resetUpdatedListItem");
    expect(mockGoBack).toHaveBeenCalled();

    await harness.unmount();
  });

  it("giữ cờ khi bản ghi bị xoá không phải bản ghi đang treo cờ", async () => {
    mockUpdatedListItem = { id: "99", nameClass: "Asset_PC" };
    mockedCheckReference.mockResolvedValue({ data: [] } as any);
    mockedDeleteItems.mockResolvedValue({} as any);
    const harness = await mount();

    await ReactTestRenderer.act(async () => {
      await harness.result.onDelete();
    });
    await pressLastAlertButton();
    await pressLastAlertButton();

    expect(dispatchedTypes()).not.toContain("asset/resetUpdatedListItem");
    expect(dispatchedTypes()).toContain("asset/setShouldRefreshList");

    await harness.unmount();
  });
});
