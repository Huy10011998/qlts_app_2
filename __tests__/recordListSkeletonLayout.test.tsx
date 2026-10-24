import React from "react";
import { StyleSheet } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import RecordListSkeleton from "../src/components/list/RecordListSkeleton";
import { getRecordCardHeight } from "../src/components/list/RecordCardSkeleton";
import { makeSharedAssetListStyles } from "../src/components/assets/shared/listStyles";
import { APP_COLORS } from "../src/utils/helpers/colors";

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

type Node = ReactTestRenderer.ReactTestInstance;

const styleOf = (node: Node) =>
  (StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>;

/** View gốc (host), khỏi đếm trùng lớp bọc `Animated.View`. */
const isHostView = (node: Node) => (node.type as unknown) === "View";

const hostViews = (root: Node) => root.findAll(isHostView);

const isCard = (node: Node) =>
  typeof node.type === "function" && node.type.name === "RecordCardSkeleton";

describe("khung chờ đo theo danh sách thật", () => {
  // Thẻ thưa dòng (vd `ListCardHistory` 26pt mỗi dòng) phải cao đúng như thẻ
  // thật, không thì mỗi thẻ hụt vài pt và cuối màn lệch hẳn một thẻ.
  it("có lineHeight thì cụm vạch cao đúng lines × lineHeight", async () => {
    expect(getRecordCardHeight("avatar", 2, 0, 26)).toBe(2 * 26 + 16 * 2 + 6 * 2);

    const tree = await mount(
      <RecordListSkeleton rows={1} lines={2} lineHeight={26} />,
    );
    const bars = hostViews(tree.root).filter((node) => {
      const { width } = styleOf(node);
      return typeof width === "string" && width.endsWith("%");
    });

    expect(bars).toHaveLength(2);
    bars.forEach((bar) => {
      const { height, marginVertical } = styleOf(bar) as {
        height: number;
        marginVertical: number;
      };
      expect(height + marginVertical * 2).toBe(26);
    });
  });

  // Dáng `row` không tự có lề: thiếu `padding` / `gap` của danh sách thật thì
  // các dòng dính nhau và chạm hai mép màn.
  it("contentStyle bọc đúng khối thẻ, ô tìm kiếm nằm ngoài", async () => {
    const contentStyle = { padding: 16, gap: 8 };
    const tree = await mount(
      <RecordListSkeleton
        hasSearchBar
        searchSummary="count"
        variant="row"
        lines={2}
        rows={3}
        contentStyle={contentStyle}
      />,
    );
    const content = tree.root.find(
      (node) => isHostView(node) && node.props.style === contentStyle,
    );

    expect(content.findAll(isCard)).toHaveLength(3);
    expect(
      hostViews(content).some((node) => styleOf(node).minHeight === 48),
    ).toBe(false);
  });

  // Picker Nội địa chỉ có một dòng chữ nhỏ "N kết quả" bên trái, không có
  // nhãn viền đỏ + số đếm như `AssetListSearchBar`.
  it("searchSummary count chỉ vẽ một vạch đếm, không vẽ nhãn", async () => {
    const badge = await mount(<RecordListSkeleton hasSearchBar rows={1} />);
    const count = await mount(
      <RecordListSkeleton hasSearchBar searchSummary="count" rows={1} />,
    );
    const hasWidth = (tree: ReactTestRenderer.ReactTestRenderer, w: number) =>
      hostViews(tree.root).some((node) => styleOf(node).width === w);

    expect(hasWidth(badge, 108)).toBe(true);
    expect(hasWidth(count, 108)).toBe(false);
    expect(hasWidth(count, 70)).toBe(true);
  });

  // Thẻ tổng số thật nằm trong `stickyHeader`; lề khung chờ phải đi theo đúng
  // lề đó, đổi một bên là danh sách nhảy lúc dữ liệu về.
  it("thẻ tổng số chừa đúng lề trên / dưới của stickyHeader", async () => {
    const { stickyHeader } = makeSharedAssetListStyles(APP_COLORS.light);
    const tree = await mount(<RecordListSkeleton hasSummaryCard rows={1} />);
    const [card] = hostViews(tree.root).filter((node) => {
      const style = styleOf(node);
      return style.padding === 12 && style.borderRadius === 14;
    });

    expect(styleOf(card).marginTop).toBe(stickyHeader.paddingTop);
    expect(styleOf(card).marginBottom).toBe(stickyHeader.paddingBottom);
  });

  // Tab Tệp: thẻ thật nằm TRONG khối trắng của nhóm, không trên nền trang.
  it("hasGroupHeader dựng thẻ bên trong khối nhóm", async () => {
    const tree = await mount(
      <RecordListSkeleton hasGroupHeader rows={2} lines={2} trailing="button" />,
    );
    const group = tree.root.find((node) => {
      if (!isHostView(node)) return false;
      const style = styleOf(node);
      return style.borderRadius === 12 && style.paddingBottom === 8;
    });

    expect(group.findAll(isCard)).toHaveLength(2);
  });

  // Thẻ gập/mở của lịch sử trung chuyển có mũi tên 16 đứng trước ngày.
  it("dáng compact có ô mũi tên 16 trước vạch ngày", async () => {
    const tree = await mount(
      <RecordListSkeleton variant="compact" lines={1} rows={1} />,
    );

    expect(
      hostViews(tree.root).some((node) => {
        const style = styleOf(node);
        return style.width === 16 && style.height === 16;
      }),
    ).toBe(true);
  });
});
