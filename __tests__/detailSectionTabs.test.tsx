import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import DetailSectionTabs, {
  computeTabWidths,
} from "../src/components/tabs/DetailSectionTabs";

let mockAllowAttach = true;

jest.mock("../src/hooks/useParams", () => ({
  useParams: () => ({ nameClass: "Asset_PC" }),
}));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    loaded: true,
    can: (_nameClass: string, action: string) =>
      action === "AttachFile" ? mockAllowAttach : true,
  }),
}));

const BRAND_RED = "#E31E24";

const TABS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mountedTrees.push(tree!);
  return tree!;
};

// Không tháo cây thì animation bề rộng còn chạy sau khi test kết thúc.
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const flatStyles = (node: ReactTestRenderer.ReactTestInstance) =>
  [node.props?.style].flat(3).filter(Boolean) as any[];

const findByStyle = (
  tree: ReactTestRenderer.ReactTestRenderer,
  predicate: (style: any) => boolean,
) =>
  tree.root.findAll(
    (node) => typeof node.type === "string" && flatStyles(node).some(predicate),
  );

const items = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(TouchableOpacity);

// Icon của react-native-vector-icons cũng là <Text> chứa glyph, nên chỉ nhặt
// đúng những chuỗi là nhãn mục.
const TAB_LABELS: string[] = TABS.map((tab) => tab.label);

const renderedLabels = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter(
      (child): child is string =>
        typeof child === "string" && TAB_LABELS.includes(child),
    );

beforeEach(() => {
  mockAllowAttach = true;
});

describe("bề rộng mục trên thanh chuyển mục", () => {
  // Tổng lệch một chút là thanh tràn ra ngoài hoặc hở một khoảng trống.
  it("tổng bề rộng các mục đúng bằng chỗ khả dụng", () => {
    const contentWidth = 354;
    const { activeWidth, inactiveWidth } = computeTabWidths({
      contentWidth,
      tabCount: 5,
      activeLabelLength: "Thông tin".length,
    });

    expect(activeWidth + inactiveWidth * 4).toBeCloseTo(contentWidth);
  });

  it("nhãn dài cũng không cho pill chiếm quá nửa thanh", () => {
    const contentWidth = 354;
    const { activeWidth, inactiveWidth } = computeTabWidths({
      contentWidth,
      tabCount: 5,
      activeLabelLength: 40,
    });

    expect(activeWidth).toBeLessThanOrEqual(contentWidth * 0.55);
    // Các mục còn lại vẫn đủ rộng để bấm.
    expect(inactiveWidth).toBeGreaterThan(36);
  });
});

describe("thanh chuyển mục trên đầu màn chi tiết", () => {
  it("chỉ mục đang chọn được tô đỏ và hiện nhãn", async () => {
    const tree = await mount(
      <DetailSectionTabs tabs={TABS} activeTab="notes" onTabPress={jest.fn()} />,
    );

    const filled = findByStyle(tree, (s) => s.backgroundColor === BRAND_RED);

    expect(filled).toHaveLength(1);
    expect(renderedLabels(tree)).toEqual(["Note"]);
  });

  // Mục không hiện nhãn vẫn phải đọc được bằng trình đọc màn hình.
  it("giữ nhãn trợ năng cho cả mục chỉ còn icon", async () => {
    const tree = await mount(
      <DetailSectionTabs tabs={TABS} activeTab="list" onTabPress={jest.fn()} />,
    );

    expect(items(tree).map((node) => node.props.accessibilityLabel)).toEqual([
      "Thông tin",
      "Note",
      "Tệp",
    ]);
    expect(items(tree).map((node) => node.props["aria-selected"])).toEqual([
      true,
      false,
      false,
    ]);
  });

  // Ở trên đầu thì thanh nằm trong luồng; còn sót `position: absolute` nào là
  // nó lại phủ lên nội dung như hồi nổi ở đáy.
  it("nằm trong luồng, không phủ lên nội dung", async () => {
    const tree = await mount(
      <DetailSectionTabs tabs={TABS} activeTab="list" onTabPress={jest.fn()} />,
    );

    const positioned = findByStyle(tree, (s) => s.position === "absolute");

    // Chỉ badge được phép absolute, mà test này không truyền badge nào.
    expect(positioned).toHaveLength(0);
  });

  it("ẩn mục Tệp khi thiếu quyền AttachFile", async () => {
    mockAllowAttach = false;
    const tree = await mount(
      <DetailSectionTabs tabs={TABS} activeTab="list" onTabPress={jest.fn()} />,
    );

    expect(items(tree).map((node) => node.props.accessibilityLabel)).toEqual([
      "Thông tin",
      "Note",
    ]);
  });

  it("hiện chấm cho mục có nội dung và số cho mục đếm được", async () => {
    const tree = await mount(
      <DetailSectionTabs
        tabs={[
          TABS[0],
          { ...TABS[1], badge: "dot" as const },
          { ...TABS[2], badge: 7 },
        ]}
        activeTab="list"
        onTabPress={jest.fn()}
      />,
    );

    const dots = findByStyle(tree, (s) => s.width === 7 && s.height === 7);
    const badgeNumbers = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child) => typeof child === "number");

    expect(dots).toHaveLength(1);
    expect(badgeNumbers).toContain(7);
  });

  // Đang xem mục đó rồi thì badge không còn để nhắc gì nữa.
  it("bỏ badge ở mục đang chọn", async () => {
    const tree = await mount(
      <DetailSectionTabs
        tabs={[TABS[0], TABS[1], { ...TABS[2], badge: 7 }]}
        activeTab="attach"
        onTabPress={jest.fn()}
      />,
    );

    const badgeNumbers = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child) => typeof child === "number");

    expect(badgeNumbers).toEqual([]);
  });

  it("tự chuyển về mục đầu khi mục đang chọn bị lọc mất", async () => {
    mockAllowAttach = false;
    const onTabPress = jest.fn();

    await mount(
      <DetailSectionTabs
        tabs={TABS}
        activeTab="attach"
        onTabPress={onTabPress}
      />,
    );

    expect(onTabPress).toHaveBeenCalledWith("list", "Thông tin");
  });
});
