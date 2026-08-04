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

const renderSheet = async (items: HomeReorderItem[]) => {
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
            onClose={() => undefined}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  });

  return tree!;
};

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

  it("chỉ một khối đang hiện thì không dựng danh sách kéo thả", async () => {
    const tree = await renderSheet(itemsFor(1));

    expect(findRows(tree)).toHaveLength(0);
    // Thay vào đó phải nói rõ vì sao chưa kéo được, không để sheet trắng.
    expect(
      tree.root.findAll(
        (instance) => instance.props?.title === "Chưa cần sắp xếp"
      ).length
    ).toBeGreaterThan(0);
  });
});
