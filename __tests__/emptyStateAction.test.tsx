import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import EmptyState from "../src/components/ui/EmptyState";

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  return tree!;
};

describe("nút hành động của EmptyState", () => {
  it("bấm được và gọi đúng handler", async () => {
    const onActionPress = jest.fn();
    const tree = await mount(
      <EmptyState
        title="Không tìm thấy kết quả"
        actionLabel="Xoá từ khoá"
        onActionPress={onActionPress}
      />,
    );

    const button = tree.root.findByType(TouchableOpacity);

    expect(
      tree.root
        .findAllByType(Text)
        .flatMap((node) => node.props.children)
        .filter((child) => typeof child === "string"),
    ).toContain("Xoá từ khoá");

    await ReactTestRenderer.act(async () => {
      button.props.onPress();
    });

    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  // Thiếu một trong hai prop thì đừng vẽ nút chết, không bấm được.
  it("không vẽ nút khi thiếu nhãn hoặc handler", async () => {
    const withoutHandler = await mount(
      <EmptyState title="Trống" actionLabel="Xoá từ khoá" />,
    );
    const withoutLabel = await mount(
      <EmptyState title="Trống" onActionPress={jest.fn()} />,
    );

    expect(withoutHandler.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(withoutLabel.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  });
});
