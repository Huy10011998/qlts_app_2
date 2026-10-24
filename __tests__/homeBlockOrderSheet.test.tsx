import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../src/context/ThemeContext";
import HomeBlockOrderSheet from "../src/screens/Home/shared/HomeBlockOrderSheet";
import {
  DEFAULT_HOME_BLOCK_ORDER,
  HOME_BLOCK_META,
} from "../src/screens/Home/shared/homeBlockOrder";
import type { HomeReorderItem } from "../src/screens/Home/shared/HomeReorderList";

const itemsFor = (count: number): HomeReorderItem[] =>
  DEFAULT_HOME_BLOCK_ORDER.slice(0, count).map((key) => ({
    key,
    ...HOME_BLOCK_META[key],
  }));

const renderSheet = async (
  items: HomeReorderItem[],
  onToggleHidden?: (key: string, hidden: boolean) => void
) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>
          <HomeBlockOrderSheet
            visible
            items={items}
            onMove={() => undefined}
            onToggleHidden={onToggleHidden}
            onClose={() => undefined}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  });

  return tree!;
};

/** Nút ẩn / hiện tròn ở mép phải mỗi hàng (giống bảng Tuỳ chỉnh). */
const findToggles = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (instance) =>
      typeof instance.type === "string" &&
      instance.props?.accessibilityRole === "switch" &&
      typeof instance.props?.onClick === "function",
    { deep: true }
  );

/** Hàng kéo được: có nhãn trợ năng và tự nhận cử chỉ. */
const findRows = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (instance) =>
      typeof instance.type === "string" &&
      typeof instance.props?.accessibilityLabel === "string" &&
      instance.props.accessibilityLabel.includes("kéo để đổi thứ tự") &&
      typeof instance.props?.onStartShouldSetResponder === "function",
    { deep: true }
  );

describe("HomeBlockOrderSheet", () => {
  it("liệt kê đúng số khối đang hiện, kèm số thứ tự trong nhãn trợ năng", async () => {
    const tree = await renderSheet(itemsFor(4));
    const rows = findRows(tree);

    expect(rows).toHaveLength(4);
    expect(rows[0].props.accessibilityLabel).toBe(
      "Số liệu toàn công ty — vị trí 1, kéo để đổi thứ tự"
    );
    expect(rows[3].props.accessibilityLabel).toContain("vị trí 4");
  });

  it("chỉ một khối vẫn dựng hàng, vì còn cần nút để ẩn khối đó", async () => {
    const tree = await renderSheet(itemsFor(1), () => undefined);

    expect(findRows(tree)).toHaveLength(1);
    expect(findToggles(tree)).toHaveLength(1);
  });

  it("nút tròn: bỏ chọn là ẩn khối, khối đang ẩn thì chọn lại được", async () => {
    const onToggleHidden = jest.fn();
    const items = itemsFor(3).map((item) =>
      item.key === "workflow" ? { ...item, hidden: true } : item
    );
    const tree = await renderSheet(items, onToggleHidden);
    const toggles = findToggles(tree);

    expect(
      toggles.map((node) => node.props.accessibilityState?.checked)
    ).toEqual([true, true, false]);
    // Khối đang ẩn vẫn ghi rõ trong nhãn trợ năng.
    expect(findRows(tree)[2].props.accessibilityLabel).toContain("đang ẩn");

    await ReactTestRenderer.act(async () => {
      toggles[0].props.onClick();
      toggles[2].props.onClick();
    });

    expect(onToggleHidden).toHaveBeenNthCalledWith(1, "stats", true);
    expect(onToggleHidden).toHaveBeenNthCalledWith(2, "workflow", false);
  });

  it("nút nằm ngoài vùng kéo, chạm nút không nhấc hàng lên", async () => {
    const tree = await renderSheet(itemsFor(2), () => undefined);
    const [firstToggle] = findToggles(tree);
    let node = firstToggle.parent;

    // Mấy lớp bọc của chính TouchableOpacity cũng mang bộ nhận chạm — bỏ qua,
    // chỉ xét từ chỗ ra khỏi nút trở lên.
    while (node && node.props?.accessibilityRole === "switch") {
      node = node.parent;
    }

    while (node) {
      expect(typeof node.props?.onStartShouldSetResponder).not.toBe(
        "function"
      );
      node = node.parent;
    }
  });
});
