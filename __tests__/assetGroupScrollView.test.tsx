import React from "react";
import { ScrollView } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import AssetGroupList from "../src/components/assets/AssetGroupList";
import AssetGroupScrollView from "../src/components/assets/shared/AssetGroupScrollView";
import { getFieldValue } from "../src/utils/fields/GetFieldValue";
import { TypeProperty } from "../src/utils/Enum";
import type { Field } from "../src/types";

const field = (name: string, moTa: string) =>
  ({ name, moTa, typeProperty: TypeProperty.String }) as Field;

const GROUPS = {
  "Thông tin chung": [field("ma", "Mã")],
  "Vị trí": [field("kho", "Kho")],
  "Tài liệu": [field("soHD", "Số hợp đồng")],
};

const mount = async (props: Record<string, any> = {}) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <AssetGroupScrollView
          groupedFields={GROUPS}
          collapsedGroups={{}}
          toggleGroup={() => {}}
          getFieldValue={getFieldValue}
          item={{ id: 1, ma: "KT-0028", kho: "Kho Tổng" } as any}
          {...props}
        />
      </ThemeProvider>,
    );
  });

  return tree!;
};

const chip = (tree: ReactTestRenderer.ReactTestRenderer, name: string) =>
  tree.root.findAll(
    (n) =>
      n.props.accessibilityLabel === `Tới nhóm ${name}` &&
      typeof n.props.onPress === "function",
  )[0];

describe("hàng nút nhảy nhanh tới nhóm ở màn chi tiết", () => {
  it("mỗi nhóm một nút, nhóm đầu sáng sẵn", async () => {
    const tree = await mount();

    expect(chip(tree, "Thông tin chung").props.accessibilityState).toEqual({
      selected: true,
    });
    expect(chip(tree, "Vị trí").props.accessibilityState).toEqual({
      selected: false,
    });
    expect(chip(tree, "Tài liệu")).toBeDefined();
  });

  it("bấm nút là cuộn tới thẻ nhóm, chừa chỗ cho hàng nút dính đầu", async () => {
    const tree = await mount();
    const scrollTo = tree.root.findAllByType(ScrollView)[0].instance.scrollTo;
    scrollTo.mockClear();

    await ReactTestRenderer.act(async () => {
      tree.root
        .findAll((n) => typeof n.props.onLayout === "function")[0]
        .props.onLayout({ nativeEvent: { layout: { height: 52 } } });
      tree.root.findByType(AssetGroupList).props.onGroupLayout("Vị trí", 400);
    });

    await ReactTestRenderer.act(async () => chip(tree, "Vị trí").props.onPress());

    expect(scrollTo).toHaveBeenCalledWith({ y: 400 - 52 - 8, animated: true });
    expect(chip(tree, "Vị trí").props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("nhóm đang gập thì mở ra", async () => {
    const toggleGroup = jest.fn();
    const tree = await mount({
      collapsedGroups: { "Tài liệu": true },
      toggleGroup,
    });

    await ReactTestRenderer.act(async () =>
      chip(tree, "Tài liệu").props.onPress(),
    );
    expect(toggleGroup).toHaveBeenCalledWith("Tài liệu");

    // Nhóm đang mở thì bấm nút không được gập lại.
    toggleGroup.mockClear();
    await ReactTestRenderer.act(async () => chip(tree, "Vị trí").props.onPress());
    expect(toggleGroup).not.toHaveBeenCalled();
  });

  it("chỉ một nhóm thì không có hàng nút", async () => {
    const tree = await mount({
      groupedFields: { "Thông tin chung": [field("ma", "Mã")] },
    });

    expect(chip(tree, "Thông tin chung")).toBeUndefined();
  });
});
