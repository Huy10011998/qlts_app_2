import React from "react";
import { Animated, Text, TouchableOpacity } from "react-native";
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
  it("tổng bề rộng các mục cộng các khe đúng bằng chỗ khả dụng", () => {
    const contentWidth = 354;
    const { activeWidth, inactiveWidth, gap } = computeTabWidths({
      contentWidth,
      tabCount: 5,
      activeLabelLength: "Thông tin".length,
    });

    expect(activeWidth + inactiveWidth * 4 + gap * 4).toBeCloseTo(contentWidth);
  });

  // Khe cạnh pill hẹp hơn các khe khác là lỗi mắt thấy được.
  it("mọi khe giữa các mục bằng nhau, kể cả khe cạnh pill", () => {
    const contentWidth = 354;
    const { activeWidth, inactiveWidth, gap } = computeTabWidths({
      contentWidth,
      tabCount: 5,
      activeLabelLength: "Tệp".length,
    });

    // Bố cục `space-between`: mép trái mục i cách mép phải mục i-1 đúng `gap`.
    expect(gap).toBeGreaterThan(0);
    expect(activeWidth + inactiveWidth * 4 + gap * 4).toBeCloseTo(contentWidth);
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

  // Số nhiều chữ số làm badge nở ra; neo mép phải thì nó nở vào phía icon, còn
  // neo mép trái thì nó bò ra ngoài ô và bị cắt mất.
  it("badge nhiều chữ số neo mép phải và chốt ở 99+", async () => {
    const tree = await mount(
      <DetailSectionTabs
        tabs={[TABS[0], TABS[1], { ...TABS[2], badge: 1000 }]}
        activeTab="list"
        onTabPress={jest.fn()}
      />,
    );

    const badges = findByStyle(tree, (s) => s.height === 16 && s.minWidth === 16);
    const badgeTexts = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child) => typeof child === "string");

    expect(badges).toHaveLength(1);
    expect(badges[0].props.style).toEqual(
      expect.objectContaining({ right: expect.any(Number) }),
    );
    expect(badges[0].props.style.left).toBeUndefined();
    expect(badgeTexts).toContain("99+");
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

  // Bề rộng chạy trên JS driver, nên đổi tab bằng code (nút "bản ghi gốc" pop về
  // kèm activeTab) mà còn animate thì nó chạy đúng lúc navigator đang chuyển màn
  // và thấy giật. Bấm bằng tay thì không có transition nào, animate mới đáng.
  describe("animation bề rộng", () => {
    const widthOfItem = (
      tree: ReactTestRenderer.ReactTestRenderer,
      label: string,
    ) => {
      const item = items(tree).find(
        (node) => node.props.accessibilityLabel === label,
      );

      // Animated đã rót giá trị vào style của View, đọc thẳng số là được.
      return item!.parent!.props.style.width as number;
    };

    const rerenderWith = (
      tree: ReactTestRenderer.ReactTestRenderer,
      activeTab: string,
      onTabPress: () => void,
    ) =>
      ReactTestRenderer.act(async () => {
        tree.update(
          <ThemeProvider>
            <DetailSectionTabs
              tabs={TABS}
              activeTab={activeTab}
              onTabPress={onTabPress}
            />
          </ThemeProvider>,
        );
      });

    let timingSpy: jest.SpyInstance;

    beforeEach(() => {
      timingSpy = jest.spyOn(Animated, "timing");
    });

    afterEach(() => {
      timingSpy.mockRestore();
    });

    it("nhảy thẳng tới bề rộng đích khi đổi tab bằng code", async () => {
      const tree = await mount(
        <DetailSectionTabs
          tabs={TABS}
          activeTab="list"
          onTabPress={jest.fn()}
        />,
      );
      const activeWidth = widthOfItem(tree, "Thông tin");

      await rerenderWith(tree, "notes", jest.fn());

      expect(timingSpy).not.toHaveBeenCalled();
      // Không chờ frame nào: "Note" đã nở sẵn, "Thông tin" đã co sẵn.
      expect(widthOfItem(tree, "Note")).toBeGreaterThan(
        widthOfItem(tree, "Thông tin"),
      );
      expect(widthOfItem(tree, "Thông tin")).toBeLessThan(activeWidth);
    });

    it("còn bấm bằng tay thì vẫn animate", async () => {
      const onTabPress = jest.fn();
      const tree = await mount(
        <DetailSectionTabs
          tabs={TABS}
          activeTab="list"
          onTabPress={onTabPress}
        />,
      );

      await ReactTestRenderer.act(async () => {
        items(tree)
          .find((node) => node.props.accessibilityLabel === "Note")!
          .props.onPress();
      });

      expect(onTabPress).toHaveBeenCalledWith("notes", "Note");

      await rerenderWith(tree, "notes", onTabPress);

      expect(timingSpy).toHaveBeenCalled();
      expect(timingSpy.mock.calls[0][1]).toMatchObject({
        useNativeDriver: false,
      });
    });
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
