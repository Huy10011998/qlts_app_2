import React from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ReactTestRenderer from "react-test-renderer";
import { Rect } from "react-native-svg";
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
  jest.restoreAllMocks();
});

const findScanLine = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll((node) => {
    if (typeof node.type !== "string") return false;
    const style = StyleSheet.flatten(node.props?.style) as any;

    return style?.position === "absolute" && style?.height === 2;
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

  // Thanh tab chỉ có icon; tên nút còn ở nhãn trợ năng.
  it("giữ nhãn 'Quét QR' cho trình đọc màn hình", async () => {
    const tree = await mount(<ScanTabButton {...({} as any)} />);
    const button = tree.root.findByType(TouchableOpacity);

    expect(button.props["aria-label"]).toBe("Quét QR");
    expect(button.props.accessibilityRole).toBe("button");
  });

  it("chạy vạch quét trong icon", async () => {
    const loop = jest.spyOn(Animated, "loop");
    const tree = await mount(<ScanTabButton {...({} as any)} />);

    expect(findScanLine(tree)).toHaveLength(1);
    expect(loop).toHaveBeenCalled();
  });

  // Người bật "giảm chuyển động" của hệ điều hành thì bỏ hẳn vạch quét, không
  // chỉ dừng animation.
  it("không chạy vạch quét khi hệ thống bật giảm chuyển động", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    const loop = jest.spyOn(Animated, "loop");
    const tree = await mount(<ScanTabButton {...({} as any)} />);

    expect(findScanLine(tree)).toHaveLength(0);
    expect(loop).not.toHaveBeenCalled();
  });

  it("chỉ thêm viền sáng khi đang ở tab quét", async () => {
    const strokeOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.findByType(Rect).props.stroke;

    // BottomTabItem của @react-navigation v7 truyền trạng thái chọn qua
    // `aria-selected`, không phải `accessibilityState`.
    const focusedTree = await mount(
      <ScanTabButton {...({ "aria-selected": true } as any)} />,
    );
    const blurredTree = await mount(
      <ScanTabButton {...({ "aria-selected": false } as any)} />,
    );

    expect(strokeOf(focusedTree)).toBeDefined();
    expect(strokeOf(blurredTree)).toBeUndefined();
  });

  // Ô đỏ nằm trong thanh tab, không nhô ra ngoài như vòng tròn cũ.
  it("ô đỏ không nhô lên khỏi thanh tab", async () => {
    const tree = await mount(<ScanTabButton {...({} as any)} />);
    const margins = tree.root
      .findAll((node) => typeof node.type === "string")
      .map((node) => (StyleSheet.flatten(node.props?.style) as any)?.marginTop)
      .filter((value) => typeof value === "number");

    expect(margins.every((value) => value >= 0)).toBe(true);
  });
});
