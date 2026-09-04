import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import MenuTreeRecents from "../src/components/menuTree/MenuTreeRecents";
import { collectTreeNodes } from "../src/components/menuTree/collectTreeNodes";

const RECENTS = [
  { id: 1, label: "Máy tính" },
  { id: 2, label: "Xe tải" },
];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  return tree!;
};

// Icon của react-native-vector-icons cũng là <Text> chứa glyph, nên chỉ nhặt
// đúng những chuỗi là nhãn mục.
const RECENT_LABELS: string[] = RECENTS.map((item) => item.label);

const labelsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter(
      (child): child is string =>
        typeof child === "string" && RECENT_LABELS.includes(child),
    );

describe("gom nút trong cây", () => {
  it("lấy cả nút con", () => {
    type Node = { id: number; children?: Node[] };
    const nodes = collectTreeNodes<Node>([
      { id: 1, children: [{ id: 11, children: [{ id: 111 }] }] },
      { id: 2 },
    ]);

    // sort() mặc định so theo chuỗi nên phải so theo số.
    expect([...nodes.keys()].sort((a, b) => Number(a) - Number(b))).toEqual([
      1, 2, 11, 111,
    ]);
    expect(nodes.get(11)?.children?.[0].id).toBe(111);
  });

  it("cây rỗng hoặc chưa có thì trả map rỗng", () => {
    expect(collectTreeNodes([]).size).toBe(0);
    expect(collectTreeNodes(undefined).size).toBe(0);
  });
});

describe("hàng Truy cập nhanh", () => {
  it("mở đúng mục được bấm", async () => {
    const onPressItem = jest.fn();
    const tree = await mount(
      <MenuTreeRecents recents={RECENTS} onPressItem={onPressItem} />,
    );

    await ReactTestRenderer.act(async () => {
      tree.root.findAllByType(TouchableOpacity)[1].props.onPress();
    });

    expect(onPressItem).toHaveBeenCalledWith(RECENTS[1]);
  });

  // Bản chụp đã lưu có thể cũ (quản trị đổi tên class): mở bằng nó là gọi API
  // với tên không còn tồn tại rồi báo lỗi, nên phải mở bằng nút trong cây.
  it("mở bằng nút trong cây, không bằng bản chụp đã lưu", async () => {
    const onPressItem = jest.fn();
    const fresh = { id: 1, label: "Máy tính", nameClass: "ThietBiCNTT_Moi" };
    const stale = { id: 1, label: "Máy tính", nameClass: "ThietBiCNTT_Cu" };
    const tree = await mount(
      <MenuTreeRecents
        recents={[stale]}
        onPressItem={onPressItem}
        nodeById={new Map([[1, fresh]])}
      />,
    );

    await ReactTestRenderer.act(async () => {
      tree.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });

    expect(onPressItem).toHaveBeenCalledWith(fresh);
  });

  // Mục bị xoá bên quản trị hoặc bị lọc vì thu hồi quyền thì không còn trong cây.
  it("bỏ chip của mục không còn trong cây", async () => {
    const tree = await mount(
      <MenuTreeRecents
        recents={RECENTS}
        onPressItem={jest.fn()}
        nodeById={new Map([[1, RECENTS[0]]])}
      />,
    );

    expect(labelsOf(tree)).toEqual(["Máy tính"]);
  });

  it("ẩn cả hàng khi không còn chip nào hợp lệ", async () => {
    const tree = await mount(
      <MenuTreeRecents
        recents={RECENTS}
        onPressItem={jest.fn()}
        nodeById={new Map()}
      />,
    );

    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  });
});
