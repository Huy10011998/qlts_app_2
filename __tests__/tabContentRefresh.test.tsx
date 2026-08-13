import React from "react";
import { RefreshControl } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import TabContent from "../src/components/tabs/TabContent";

jest.mock("../src/components/assets/AssetGroupList", () => "AssetGroupList");

const baseProps = {
  activeTab: "list",
  groupedFields: {},
  collapsedGroups: {},
  toggleGroup: jest.fn(),
  getFieldValue: () => "---",
  item: { id: "7" },
  nameClass: "Asset_PC",
  fieldActive: [],
} as any;

const mount = async (props: Record<string, any>) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <TabContent {...baseProps} {...props} />
      </ThemeProvider>,
    );
  });

  return tree!;
};

describe("kéo để làm mới ở mục Thông tin", () => {
  it("gọi onRefresh khi kéo xuống", async () => {
    const onRefresh = jest.fn();
    const tree = await mount({ onRefresh, isRefreshing: false });
    const refreshControl = tree.root.findByType(RefreshControl);

    expect(refreshControl.props.refreshing).toBe(false);

    await ReactTestRenderer.act(async () => {
      refreshControl.props.onRefresh();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  // Màn nào không truyền onRefresh (chi tiết QR, lịch sử) thì không có gì để tải
  // lại, đừng gắn cử chỉ kéo vào đó.
  it("không gắn cử chỉ kéo khi màn không hỗ trợ tải lại", async () => {
    const tree = await mount({});

    expect(tree.root.findAllByType(RefreshControl)).toHaveLength(0);
  });
});
