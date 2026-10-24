import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import SwipeableListRow, { type SwipeRowAction } from "../src/components/list/SwipeableListRow";
import { ThemeProvider } from "../src/context/ThemeContext";

let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
});

const render = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mounted.push(tree!);
  return tree!;
};

const mount = (actions: SwipeRowAction[], props: { disabled?: boolean } = {}) =>
  render(
    <SwipeableListRow actions={actions} {...props}>
      <Text>Thẻ</Text>
    </SwipeableListRow>,
  );

const buttonsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(TouchableOpacity).filter((node) => node.props.accessibilityRole === "button");

describe("SwipeableListRow", () => {
  it("một nút (danh sách tài sản): bấm là chạy hành động", async () => {
    const onPress = jest.fn();
    const tree = await mount([{ key: "addChild", label: "Thêm bảo trì", onPress }]);

    const buttons = buttonsOf(tree);
    expect(buttons.map((node) => node.props.accessibilityLabel)).toEqual(["Thêm bảo trì"]);

    await ReactTestRenderer.act(async () => buttons[0].props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("nhiều nút (duyệt phiếu): giữ đúng thứ tự trái sang phải", async () => {
    const tree = await mount(
      ["Trả bước", "Từ chối", "Không ý kiến", "Duyệt"].map((label) => ({
        key: label,
        label,
        closeOnPress: true,
        onPress: jest.fn(),
      })),
    );

    expect(buttonsOf(tree).map((node) => node.props.accessibilityLabel)).toEqual([
      "Trả bước",
      "Từ chối",
      "Không ý kiến",
      "Duyệt",
    ]);
  });

  it("đang bận thì chặn bấm thêm", async () => {
    const onPress = jest.fn();
    const tree = await mount([{ key: "addChild", label: "Thêm bảo trì", busy: true, onPress }]);

    await ReactTestRenderer.act(async () => buttonsOf(tree)[0].props.onPress());
    expect(onPress).not.toHaveBeenCalled();
  });

  it("tắt thì chỉ còn thẻ, không có nút", async () => {
    const tree = await mount([{ key: "duyet", label: "Duyệt", onPress: jest.fn() }], { disabled: true });

    expect(buttonsOf(tree)).toHaveLength(0);
    expect(tree.root.findAllByType(Text).map((node) => node.props.children)).toEqual(["Thẻ"]);
  });
});
