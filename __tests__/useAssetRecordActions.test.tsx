import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useAssetRecordActions } from "../src/components/assets/detailActions/useAssetRecordActions";
import { checkReferenceUsage, deleteItems } from "../src/services/data/callApi";

const mockRoute = { name: "AssetDetails", params: {} as any };
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockShowAlert = jest.fn();
let mockAllowedActions: string[] = [];

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("react-redux", () => ({ useDispatch: () => jest.fn() }));

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
});

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
});
