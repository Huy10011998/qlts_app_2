import React from "react";
import { View } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import MenuCardSkeleton from "../src/components/ui/MenuCardSkeleton";

const ROW_HEIGHT = 58 + 6;

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

const rowCountOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  wrapOf(tree).props.children.length;

describe("khung chờ danh sách thẻ", () => {
  // Số dòng cố định để chừa vùng trống bên dưới trên màn lớn, nhìn như danh sách
  // đã tải xong mà thiếu dữ liệu.
  it("dựng đủ thẻ để phủ kín chiều cao khung", async () => {
    const tree = await mount(<MenuCardSkeleton />);

    await layout(tree, 640);

    expect(rowCountOf(tree)).toBe(Math.ceil(640 / ROW_HEIGHT));
  });

  it("khung cao hơn thì thêm thẻ", async () => {
    const tree = await mount(<MenuCardSkeleton />);

    await layout(tree, 640);
    const shortCount = rowCountOf(tree);
    await layout(tree, 1280);

    expect(rowCountOf(tree)).toBeGreaterThan(shortCount);
  });

  it("truyền rows thì giữ đúng số đó", async () => {
    const tree = await mount(<MenuCardSkeleton rows={3} />);

    await layout(tree, 1280);

    expect(rowCountOf(tree)).toBe(3);
  });
});
