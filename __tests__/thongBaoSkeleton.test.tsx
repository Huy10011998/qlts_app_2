import React from "react";
import { StyleSheet, View } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import ThongBaoRowSkeleton, {
  THONG_BAO_ROW_HEIGHT,
} from "../src/screens/ThongBao/ThongBaoRowSkeleton";

// Vòng nhấp nháy chỉ dừng khi unmount; còn sống thì Jest không thoát được.
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

const wrapOf = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    (node) => node.type === View && node.props.accessibilityLabel === label,
  )[0];

/** Mỗi dòng là một View có gạch mảnh ở đáy — đúng dáng `ThongBaoRow`. */
const rowCountOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      node.type === View &&
      StyleSheet.flatten(node.props.style)?.borderBottomWidth ===
        StyleSheet.hairlineWidth,
  ).length;

describe("khung chờ dòng thông báo", () => {
  // Dòng thật: đệm 12 trên dưới + tiêu đề 14 / nội dung 13 / dòng nhóm 11.5 ≈ 76.
  // Lệch xa con số này là khung chờ đã quay về dáng thẻ bản ghi ~92pt.
  it("cao đúng một dòng thông báo thật", () => {
    expect(THONG_BAO_ROW_HEIGHT).toBeGreaterThan(74);
    expect(THONG_BAO_ROW_HEIGHT).toBeLessThan(78);
  });

  it("bỏ trống `rows` thì dựng đủ dòng phủ kín khung", async () => {
    const tree = await mount(<ThongBaoRowSkeleton />);

    await ReactTestRenderer.act(async () => {
      wrapOf(tree, "Đang tải thông báo").props.onLayout({
        nativeEvent: { layout: { height: 700 } },
      });
    });

    expect(rowCountOf(tree)).toBe(Math.ceil(700 / THONG_BAO_ROW_HEIGHT));
  });

  // Bảng chuông và chân danh sách cao theo nội dung: khung chờ mà giãn `flex`
  // hay tự đo thì chạy vòng — phải đúng số dòng được truyền và không giãn.
  it("truyền `rows` thì đúng số dòng đó, khung không giãn", async () => {
    const tree = await mount(
      <ThongBaoRowSkeleton rows={2} accessibilityLabel="Đang tải thêm" />,
    );
    const wrap = wrapOf(tree, "Đang tải thêm");

    expect(rowCountOf(tree)).toBe(2);
    expect(StyleSheet.flatten(wrap.props.style)?.flex).toBeUndefined();
    expect(wrap.props.onLayout).toBeUndefined();
  });
});
