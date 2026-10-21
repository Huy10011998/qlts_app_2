import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { HeaderDetailsModalHeader } from "../src/components/header/HeaderDetails";

const render = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  return tree!;
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((child) => typeof child === "string");

describe("HeaderDetails – nhãn badge theo tiêu đề", () => {
  it.each([
    ["Thêm mới", "Tạo mới"],
    // Trước đây so với "moi" không dấu nên tiêu đề chỉ có "mới" rơi xuống
    // nhãn mặc định.
    ["Công việc mới", "Tạo mới"],
    ["Chỉnh sửa", "Cập nhật"],
    ["Danh sách", "Danh sách"],
    ["Chi tiết lịch sử", "Chi tiết"],
    ["Đại hội cổ đông", "Biểu quyết"],
    ["Hồ sơ cá nhân", "Thông tin"],
  ])("“%s” → “%s”", async (title, expected) => {
    const tree = await render(<HeaderDetailsModalHeader title={title} />);

    expect(texts(tree)).toContain(expected);
  });

  it("khớp cả tiêu đề ở dạng dấu tổ hợp (NFD)", async () => {
    const tree = await render(
      <HeaderDetailsModalHeader title={"Phiếu mới".normalize("NFD")} />,
    );

    expect(texts(tree)).toContain("Tạo mới");
  });
});

describe("HeaderDetails – nút quay lại", () => {
  it("có nhãn trợ năng và vùng bấm nới rộng", async () => {
    const onBack = jest.fn();
    const tree = await render(
      <HeaderDetailsModalHeader title="Báo cáo" onBack={onBack} />,
    );
    const button = tree.root.findByType(TouchableOpacity);

    expect(button.props.accessibilityLabel).toBe("Quay lại");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.hitSlop).toBe(10);
  });
});
