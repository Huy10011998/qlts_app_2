import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { createTabBarButton } from "../src/navigation/shared/TabBarItemButton";
import ScanTabButton from "../src/navigation/shared/ScanTabButton";
import { Rect } from "react-native-svg";

import { TAB_ACTIVE_COLOR } from "../src/navigation/shared/tabBarTheme";

/**
 * Trên tablet (chiều rộng ≥ 768) react-navigation truyền style xếp ngang cho
 * `tabBarButton` để nhãn nằm cạnh icon. Các ô tab ở đây tự vẽ icon + nhãn theo
 * chiều dọc, nên style đó không được thắng.
 */
const TABLET_ITEM_STYLE = {
  alignItems: "center" as const,
  flex: 1,
  flexDirection: "row" as const,
  justifyContent: "center" as const,
  padding: 5,
};

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mountedTrees.push(tree!);
  return tree!;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const rootStyle = (tree: ReactTestRenderer.ReactTestRenderer) =>
  StyleSheet.flatten(
    tree.root.findByType(TouchableOpacity).props.style,
  ) as Record<string, unknown>;

describe("layout ô tab khi navigator xếp nhãn cạnh icon", () => {
  const HomeButton = createTabBarButton({
    label: "Trang chủ",
    icon: "home",
    iconOutline: "home-outline",
  });

  it("giữ chiều dọc cho ô tab thường", async () => {
    const tree = await mount(
      <HomeButton {...({ style: TABLET_ITEM_STYLE } as any)} />,
    );

    expect(rootStyle(tree).flexDirection).toBe("column");
  });

  it("giữ chiều dọc cho nút Quét QR", async () => {
    const tree = await mount(
      <ScanTabButton {...({ style: TABLET_ITEM_STYLE } as any)} />,
    );

    expect(rootStyle(tree).flexDirection).toBe("column");
  });

  /**
   * Vạch active luôn có mặt trong luồng layout và chỉ đổi màu: kiểu cũ chỉ render
   * khi active bằng một lớp `position: absolute` phủ lên đỉnh ô tab, và trên
   * Android có máy chỉ thấy vạch ở một ô tab.
   */
  const findIndicator = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll((node) => {
      if (typeof node.type !== "string") return false;
      const style = StyleSheet.flatten(node.props?.style) as any;

      return style?.height === 3 && style?.width === 48;
    });

  it("ô tab nào cũng có chỗ cho vạch active, kể cả khi không active", async () => {
    const tree = await mount(<HomeButton {...({} as any)} />);
    const [indicator] = findIndicator(tree);

    expect(indicator).toBeDefined();
    expect(
      (StyleSheet.flatten(indicator.props.style) as any).backgroundColor,
    ).toBe("transparent");
    expect(
      (StyleSheet.flatten(indicator.props.style) as any).position,
    ).toBeUndefined();
  });

  /**
   * Nền đỏ sau icon phải là hình SVG bo góc, không phải `backgroundColor` +
   * `borderRadius` của View: trên Android đường đó không cho ra góc bo nên ô đỏ
   * ra hình vuông trong khi iOS bo bình thường.
   */
  it("nền ô icon khi active là hình bo góc vẽ bằng SVG", async () => {
    const tree = await mount(
      <HomeButton {...({ "aria-selected": true } as any)} />,
    );
    const rects = tree.root.findAllByType(Rect);

    expect(rects).toHaveLength(1);
    expect(rects[0].props.rx).toBeGreaterThan(0);
    expect(rects[0].props.fill).toBe(TAB_ACTIVE_COLOR);

    const tile = tree.root.findAll((node) => {
      if (typeof node.type !== "string") return false;
      const style = StyleSheet.flatten(node.props?.style) as any;

      return style?.width === 32 && style?.height === 32;
    });

    // Không còn ô View nào tự tô nền: chỉ SVG vẽ hình.
    expect(
      tile.map(
        (node) =>
          (StyleSheet.flatten(node.props.style) as any).backgroundColor,
      ),
    ).not.toContain(TAB_ACTIVE_COLOR);
  });

  it("ô tab không active thì không vẽ nền ô icon", async () => {
    const tree = await mount(<HomeButton {...({} as any)} />);

    expect(tree.root.findAllByType(Rect)).toHaveLength(0);
  });

  it("ô tab đang active thì vạch tô màu nhấn", async () => {
    const tree = await mount(
      <HomeButton
        {...({ style: TABLET_ITEM_STYLE, "aria-selected": true } as any)}
      />,
    );
    const [indicator] = findIndicator(tree);

    expect(
      (StyleSheet.flatten(indicator.props.style) as any).backgroundColor,
    ).toBe(TAB_ACTIVE_COLOR);
  });
});
