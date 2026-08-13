import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useDetailTabBadges } from "../src/components/tabs/useDetailTabBadges";
import { getListAttachFile } from "../src/services";

let mockAllowAttach = true;

jest.mock("../src/services", () => ({ getListAttachFile: jest.fn() }));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    loaded: true,
    can: (_nameClass: string, action: string) =>
      action === "AttachFile" ? mockAllowAttach : true,
  }),
}));

jest.mock("../src/hooks/useSafeAlert", () => ({
  useSafeAlert: () => ({ isMounted: () => true }),
}));

jest.mock("../src/utils/Logger", () => ({ error: jest.fn() }));

const mockedGetListAttachFile = jest.mocked(getListAttachFile);

const TABS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

type HookResult = ReturnType<typeof useDetailTabBadges>;

function Harness({
  item,
  onRender,
}: {
  item: Record<string, any>;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDetailTabBadges({ tabs: TABS, item, nameClass: "Asset_PC" }));
  return null;
}

const mount = async (item: Record<string, any>) => {
  let latest: HookResult;

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <Harness
        item={item}
        onRender={(result) => {
          latest = result;
        }}
      />,
    );
  });

  const badgeOf = (key: string) =>
    latest!?.find((tab) => tab.key === key)?.badge;

  return { badgeOf };
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
});
