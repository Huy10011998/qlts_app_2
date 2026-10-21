import React from "react";
import { StyleSheet, View } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import MenuCardSkeleton from "../src/components/ui/MenuCardSkeleton";

// Vòng nhấp nháy chỉ dừng khi component unmount; còn sống thì Jest treo không
// thoát được, nên mọi cây dựng ra đều phải tháo sau mỗi test.
let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
});

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mounted.push(tree!);

  return tree!;
};

const wrapOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(View)[0];

const layout = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  height: number,
) => {
  await ReactTestRenderer.act(async () => {
    wrapOf(tree).props.onLayout({ nativeEvent: { layout: { height } } });
  });
};

const hostNodesWhere = (
  tree: ReactTestRenderer.ReactTestRenderer,
  predicate: (style: Record<string, unknown>) => boolean,
) =>
  tree.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      predicate((StyleSheet.flatten(node.props.style) ?? {}) as never),
  );

const rowCountOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      node.props.testID === "menu-card-skeleton-card",
  ).length;

describe("dáng thẻ của khung chờ thẻ menu", () => {
  // Thẻ báo cáo cao hơn thẻ menu (icon 40 + 13×2 + viền, cách 9), đếm theo nhịp
  // 64 của thẻ menu là thừa thẻ và lệch dần xuống.
  it("thẻ báo cáo đếm theo nhịp riêng", async () => {
    const tree = await mount(<MenuCardSkeleton variant="report" />);

    await layout(tree, 760);

    const step = 40 + 13 * 2 + StyleSheet.hairlineWidth * 2 + 9;
    expect(rowCountOf(tree)).toBe(Math.ceil(760 / step));
  });

  it("danh mục liên kết: thẻ 56 cách 8, không có ô chevron xám", async () => {
    const tree = await mount(<MenuCardSkeleton variant="related" rows={2} />);

    expect(hostNodesWhere(tree, (s) => s.minHeight === 56)).toHaveLength(2);
    expect(
      hostNodesWhere(tree, (s) => s.width === 24 && s.height === 24),
    ).toHaveLength(0);
  });

  // Trạng thái lưu trên máy quyết định hai hàng này có hay không, nên chỉ dựng
  // khi nơi gọi bảo có.
  it("hàng Truy cập nhanh và nút Thu tất cả chỉ có khi được bật", async () => {
    const chipsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
      hostNodesWhere(tree, (s) => s.height === 33);
    const collapseOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
      hostNodesWhere(tree, (s) => s.width === 68 && s.height === 13);

    const plain = await mount(<MenuCardSkeleton hasSearchBar rows={1} />);
    expect(chipsOf(plain)).toHaveLength(0);
    expect(collapseOf(plain)).toHaveLength(0);

    const full = await mount(
      <MenuCardSkeleton hasSearchBar hasRecents hasCollapseAll rows={1} />,
    );
    expect(chipsOf(full)).toHaveLength(3);
    expect(collapseOf(full)).toHaveLength(1);
  });

  // Panel trượt đã có lề riêng.
  it("bỏ được lề của khung", async () => {
    const tree = await mount(
      <MenuCardSkeleton rows={1} paddingTop={0} paddingHorizontal={0} />,
    );

    expect(StyleSheet.flatten(wrapOf(tree).props.style).paddingHorizontal).toBe(0);
    expect(hostNodesWhere(tree, (s) => s.paddingTop === 4)).toHaveLength(0);
  });
});
