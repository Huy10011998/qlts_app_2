import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useDetailTabBadges } from "../src/components/tabs/useDetailTabBadges";
import {
  getClassReference,
  getListAttachFile,
  getListHistory,
} from "../src/services";

let mockAllowAttach = true;

jest.mock("../src/services", () => ({
  getClassReference: jest.fn(),
  getListAttachFile: jest.fn(),
  getListHistory: jest.fn(),
}));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    loaded: true,
    can: (_nameClass: string, action: string) =>
      action === "AttachFile" ? mockAllowAttach : true,
  }),
}));

// Ổn định như bản thật (useCallback) — hàm mới mỗi render là effect đếm chạy lại.
const mockIsMounted = () => true;
jest.mock("../src/hooks/useSafeAlert", () => ({
  useSafeAlert: () => ({ isMounted: mockIsMounted }),
}));

jest.mock("../src/utils/Logger", () => ({ error: jest.fn() }));

const mockedGetClassReference = jest.mocked(getClassReference);
const mockedGetListAttachFile = jest.mocked(getListAttachFile);
const mockedGetListHistory = jest.mocked(getListHistory);

const TABS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

type HookResult = ReturnType<typeof useDetailTabBadges>;

const DETAIL_TABS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "details", label: "Chi tiết", icon: "list-outline" },
] as const;

function Harness({
  item,
  tabs = TABS,
  nameClass = "Asset_PC",
  onRender,
}: {
  item: Record<string, any>;
  tabs?: readonly any[];
  nameClass?: string;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDetailTabBadges({ tabs, item, nameClass }));
  return null;
}

const mount = async (
  item: Record<string, any>,
  options: { tabs?: readonly any[]; nameClass?: string } = {},
) => {
  let latest: HookResult;
  let tree: ReactTestRenderer.ReactTestRenderer;
  const render = (nextItem: Record<string, any>) => (
    <Harness
      item={nextItem}
      tabs={options.tabs}
      nameClass={options.nameClass}
      onRender={(result) => {
        latest = result;
      }}
    />
  );

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(render(item));
  });

  const badgeOf = (key: string) =>
    latest!?.find((tab) => tab.key === key)?.badge;

  /** Màn nạp lại bản ghi: cùng id, object mới (như `setItem(response.data)`). */
  const reloadItem = async (nextItem: Record<string, any>) => {
    await ReactTestRenderer.act(async () => {
      tree.update(render(nextItem));
    });
  };

  return { badgeOf, reloadItem };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAllowAttach = true;
  mockedGetListAttachFile.mockResolvedValue({
    data: { items: [], totalCount: 3 },
  } as any);
});

describe("useDetailTabBadges", () => {
  it("chấm cho mục Note khi bản ghi có ghi chú", async () => {
    const { badgeOf } = await mount({ id: "7", notes: "<p>Đã bảo trì</p>" });

    expect(badgeOf("notes")).toBe("dot");
  });

  it("không chấm khi ghi chú rỗng", async () => {
    const { badgeOf } = await mount({ id: "7", notes: "   " });

    expect(badgeOf("notes")).toBeUndefined();
  });

  it("đếm tệp bằng một request nhẹ, không tải cả danh sách", async () => {
    const { badgeOf } = await mount({ id: "7" });

    expect(badgeOf("attach")).toBe(3);
    // pageSize = 1: chỉ cần totalCount, không kéo về bản ghi nào.
    expect(mockedGetListAttachFile).toHaveBeenCalledWith(
      "Asset_PC",
      "",
      1,
      0,
      "",
      expect.any(Array),
      [],
    );
  });

  it("không gọi đếm khi thiếu quyền AttachFile", async () => {
    mockAllowAttach = false;
    const { badgeOf } = await mount({ id: "7" });

    expect(mockedGetListAttachFile).not.toHaveBeenCalled();
    expect(badgeOf("attach")).toBeUndefined();
  });

  // Badge là thông tin phụ: đếm lỗi thì ẩn, không làm hỏng màn chi tiết.
  it("ẩn badge khi gọi đếm lỗi", async () => {
    mockedGetListAttachFile.mockRejectedValue(new Error("offline"));
    const { badgeOf } = await mount({ id: "7" });

    expect(badgeOf("attach")).toBeUndefined();
  });

  /* Số đã biết hiện ngay, nhưng vẫn hỏi lại: 23/10/2026 BE ẩn Công việc / Kế
     hoạch khỏi Nhân viên, danh sách trong mục đã trống mà badge còn "2" tới khi
     tắt app. Mỗi test một nameClass vì số đã biết giữ ở cấp module. */
  it("đếm lại danh mục liên kết mỗi lần vào màn", async () => {
    mockedGetClassReference.mockResolvedValue({
      data: [{ name: "CV_CongViec" }, { name: "CV_KeHoach" }],
    } as any);
    const first = await mount({ id: "231" }, { tabs: DETAIL_TABS, nameClass: "NhanVien" });
    expect(first.badgeOf("details")).toBe(2);

    mockedGetClassReference.mockResolvedValue({ data: [] } as any);
    const again = await mount({ id: "231" }, { tabs: DETAIL_TABS, nameClass: "NhanVien" });

    expect(mockedGetClassReference).toHaveBeenCalledTimes(2);
    expect(again.badgeOf("details")).toBeUndefined();
  });

  it("mất mạng thì giữ số đã biết", async () => {
    mockedGetClassReference.mockResolvedValue({ data: [{ name: "A" }] } as any);
    await mount({ id: "1" }, { tabs: DETAIL_TABS, nameClass: "Asset_Offline" });

    mockedGetClassReference.mockRejectedValue(new Error("offline"));
    const again = await mount({ id: "1" }, { tabs: DETAIL_TABS, nameClass: "Asset_Offline" });

    expect(again.badgeOf("details")).toBe(1);
  });

  it("chưa biết số mà đếm lỗi thì ẩn badge", async () => {
    mockedGetClassReference.mockRejectedValue(new Error("offline"));
    const { badgeOf } = await mount({ id: "1" }, { tabs: DETAIL_TABS, nameClass: "Asset_Never" });

    expect(badgeOf("details")).toBeUndefined();
  });

  /* Sửa xong là quay về đúng màn chi tiết cũ (goBack) với cùng id: chỉ theo id
     thì lịch sử đã thêm dòng mà badge vẫn số cũ. */
  it("đếm lại khi màn nạp lại bản ghi, cùng id", async () => {
    const tabs = [
      ...DETAIL_TABS,
      { key: "history", label: "Lịch sử", icon: "time-outline" },
      { key: "attach", label: "Tệp", icon: "attach-outline" },
    ];
    mockedGetClassReference.mockResolvedValue({ data: [{ name: "A" }] } as any);
    mockedGetListHistory.mockResolvedValue({ data: [{}] } as any);
    const harness = await mount({ id: "5", ten: "cũ" }, { tabs, nameClass: "Asset_Reload" });
    expect(harness.badgeOf("history")).toBe(1);

    mockedGetListHistory.mockResolvedValue({ data: [{}, {}] } as any);
    mockedGetListAttachFile.mockResolvedValue({ data: { items: [], totalCount: 4 } } as any);
    await harness.reloadItem({ id: "5", ten: "mới" });

    expect(harness.badgeOf("history")).toBe(2);
    expect(harness.badgeOf("attach")).toBe(4);
    expect(mockedGetClassReference).toHaveBeenCalledTimes(2);
  });
});
