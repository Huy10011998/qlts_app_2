import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import ScanTabButton from "../src/navigation/shared/ScanTabButton";

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });

  mountedTrees.push(tree!);
  return tree!;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

describe("nút Quét QR ở giữa thanh tab", () => {
  it("gọi onPress khi bấm", async () => {
    const onPress = jest.fn();
    const tree = await mount(<ScanTabButton {...({ onPress } as any)} />);

    await ReactTestRenderer.act(async () => {
      tree.root.findByType(TouchableOpacity).props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // `tabBarButton` thay toàn bộ nội dung nút, nên nhãn "Quét QR" không còn được
  // render ra chữ — thông tin đó phải nằm ở accessibilityLabel.
  it("giữ nhãn cho trình đọc màn hình dù không hiện chữ", async () => {
    const tree = await mount(<ScanTabButton {...({} as any)} />);
    const button = tree.root.findByType(TouchableOpacity);

    expect(button.props.accessibilityLabel).toBe("Quét QR");
    expect(button.props.accessibilityRole).toBe("button");

    // Icon của react-native-vector-icons cũng là một <Text> chứa glyph, nên chỉ
    // khẳng định được là không có <Text> nào hiện ra chữ "Quét QR".
    const renderedStrings = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child): child is string => typeof child === "string");

    expect(renderedStrings).not.toContain("Quét QR");
  });

  it("chỉ thêm viền sáng khi đang ở tab quét", async () => {
    const countBorders = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.findAll(
        (node) =>
          typeof node.type === "string" &&
          Array.isArray(node.props?.style) &&
          node.props.style.some(
            (style: any) => style && typeof style.borderWidth === "number",
          ),
      ).length;

    const focusedTree = await mount(
      <ScanTabButton
        {...({ accessibilityState: { selected: true } } as any)}
      />,
    );
    const blurredTree = await mount(
      <ScanTabButton
        {...({ accessibilityState: { selected: false } } as any)}
      />,
    );

    expect(countBorders(focusedTree)).toBe(1);
    expect(countBorders(blurredTree)).toBe(0);
  });
});
