import React from "react";
import { Animated, Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import RecordListSkeleton from "../src/components/list/RecordListSkeleton";
import { getRecordCardHeight } from "../src/components/list/RecordCardSkeleton";
import AssetDetailsSkeleton from "../src/components/assets/shared/AssetDetailsSkeleton";
import type { Field } from "../src/types/index";
import { TypeProperty } from "../src/utils/Enum";

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

const wrapOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByProps({ accessibilityLabel: "Đang tải danh sách" })[0];

const layout = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  height: number,
) => {
  await ReactTestRenderer.act(async () => {
    wrapOf(tree).props.onLayout({ nativeEvent: { layout: { height } } });
  });
};

const cardCountOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      typeof node.type === "function" && node.type.name === "RecordCardSkeleton",
  ).length;

describe("chiều cao thẻ bản ghi", () => {
  // Ba dáng thẻ có thật trong app, đo từ chính thẻ đang chạy — nếu ba dáng cho
  // cùng một chiều cao thì việc chia biến thể đã mất ý nghĩa.
  it("ba biến thể ra ba chiều cao khác nhau", () => {
    const avatar = getRecordCardHeight("avatar", 3);
    const compact = getRecordCardHeight("compact", 1);
    const row = getRecordCardHeight("row", 2);

    expect(new Set([avatar, compact, row]).size).toBe(3);
    expect(compact).toBeLessThan(avatar);
    expect(row).toBeLessThan(avatar);
  });

  it("nhiều dòng field thì thẻ cao hơn", () => {
    expect(getRecordCardHeight("avatar", 5)).toBeGreaterThan(
      getRecordCardHeight("avatar", 2),
    );
  });
});

describe("khung chờ danh sách bản ghi", () => {
  it("dựng đủ thẻ để phủ kín chiều cao khung", async () => {
    const tree = await mount(<RecordListSkeleton />);

    await layout(tree, 900);

    expect(cardCountOf(tree)).toBe(
      Math.ceil(900 / getRecordCardHeight("avatar", 3)),
    );
  });

  // Vòng xoay cũ xoá mất cả ô tìm kiếm và thẻ tổng số; dựng lại đúng chỗ của
  // chúng thì lúc dữ liệu về danh sách không bị đẩy xuống.
  it("thẻ thấp hơn thì dựng được nhiều thẻ hơn trong cùng khung", async () => {
    const tall = await mount(<RecordListSkeleton lines={5} />);
    const short = await mount(<RecordListSkeleton variant="compact" lines={1} />);

    await layout(tall, 900);
    await layout(short, 900);

    expect(cardCountOf(short)).toBeGreaterThan(cardCountOf(tall));
  });
});

const field = (
  name: string,
  moTa: string,
  groupLayout: string,
  typeProperty = TypeProperty.Text,
) => ({ name, moTa, groupLayout, typeProperty }) as unknown as Field;

describe("khung chờ chi tiết bản ghi", () => {
  // Bố cục ở màn này KHÔNG phải đoán: `field` do màn danh sách truyền sẵn qua
  // route param, nên khung chờ phải dựng đúng số nhóm/số field và hiện nhãn thật.
  it("dựng đúng số nhóm và nhãn thật của từng field", async () => {
    const tree = await mount(
      <AssetDetailsSkeleton
        tabCount={5}
        groupedFields={{
          "Thông tin chung": [
            field("ma", "Mã thiết bị", "Thông tin chung"),
            field("ten", "Tên thiết bị", "Thông tin chung"),
          ],
          "Hình ảnh": [
            field("anh", "Ảnh thiết bị", "Hình ảnh", TypeProperty.Image),
          ],
        }}
      />,
    );

    const texts = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child): child is string => typeof child === "string");

    expect(texts).toContain("Thông tin chung");
    expect(texts).toContain("Hình ảnh");
    expect(texts).toContain("Mã thiết bị");
    expect(texts).toContain("Tên thiết bị");
    expect(texts).toContain("Ảnh thiết bị");
  });

  // Thanh tab phải đúng số mục thật (5, hoặc 4 khi thiếu quyền xem Tệp), không
  // thì lúc dữ liệu về ô tab co lại một nhịp.
  it("thanh tab dựng đúng số mục được truyền", async () => {
    // Không có field nào thì mọi khối nhấp nháy đều là một ô tab.
    const tabsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.findAllByType(Animated.View).length;

    const five = await mount(
      <AssetDetailsSkeleton tabCount={5} groupedFields={{}} />,
    );
    const four = await mount(
      <AssetDetailsSkeleton tabCount={4} groupedFields={{}} />,
    );

    expect(tabsOf(five)).toBe(5);
    expect(tabsOf(four)).toBe(4);
  });
});
