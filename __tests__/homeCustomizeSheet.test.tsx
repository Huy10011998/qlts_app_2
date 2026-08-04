import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../src/context/ThemeContext";
import HomeCustomizeSheet, {
  buildHomeCustomizeSections,
} from "../src/screens/Home/shared/HomeCustomizeSheet";

const sections = buildHomeCustomizeSections({
  featureItems: [
    {
      id: "5",
      label: "Nội địa",
      iconName: "business-outline",
      // longLabel của API thường trùng y nhãn.
      description: "Nội địa",
    },
    {
      id: "3",
      label: "Camera",
      iconName: "camera-outline",
      description: "Giám sát hệ thống",
    },
  ],
  reportItems: [],
  vehicleItems: [],
});

const renderSheet = async (props?: {
  onTogglePinned?: (id: string) => void;
  pinnedIds?: string[];
}) => {
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
          <HomeCustomizeSheet
            visible
            sections={sections}
            pinnedIds={props?.pinnedIds ?? ["3"]}
            onTogglePinned={props?.onTogglePinned ?? (() => {})}
            onClose={() => {}}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  return tree!;
};

const findTexts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

describe("HomeCustomizeSheet", () => {
  it("hiện nhãn nhóm và không lặp lại mô tả trùng nhãn", async () => {
    const tree = await renderSheet();
    const texts = findTexts(tree);

    expect(texts).toContain("CHỨC NĂNG");
    expect(texts).toContain("Giám sát hệ thống");
    expect(texts.filter((text) => text === "Nội địa")).toHaveLength(1);
  });

  it("phụ đề đếm số mục còn khả dụng, bỏ id đã mất quyền", async () => {
    const tree = await renderSheet({ pinnedIds: ["3", "khong-con-quyen"] });

    expect(findTexts(tree)).toContain("1 mục đang hiện ở Truy cập nhanh");
  });

  // Không còn nút "Xong": đóng bằng dấu X hoặc bấm ra ngoài, nên mỗi dòng phải
  // ăn ngay khi bấm.
  it("bấm một dòng là ghim/bỏ ghim ngay", async () => {
    const onTogglePinned = jest.fn();
    const tree = await renderSheet({ onTogglePinned });
    const row = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.props.accessibilityLabel === "Nội địa");

    await ReactTestRenderer.act(async () => {
      row?.props.onPress();
    });

    expect(onTogglePinned).toHaveBeenCalledWith("5");
  });
});
