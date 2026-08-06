import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../src/context/ThemeContext";
import HomeAssetStructurePager from "../src/screens/Home/shared/HomeAssetStructurePager";
import type { HomeMachineDashboardPayload } from "../src/screens/Home/shared/homeData";

// Khu cuộn ngang có ba trang, hai biểu đồ SVG và một bottom sheet — lỗi kiểu này
// chỉ nổ lúc mount chứ không phải lúc biên dịch, nên test dựng cây thật.

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
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

  mountedTrees.push(tree!);
  return tree!;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) =>
      Array.isArray(node.props.children)
        ? node.props.children.join("")
        : String(node.props.children ?? ""),
    );

const MACHINE: HomeMachineDashboardPayload = {
  totalQuantity: 5578,
  totalValue: 486320000000,
  units: Array.from({ length: 8 }, (_, index) => ({
    key: `unit-${index}`,
    name: `Đơn vị ${index + 1}`,
    quantity: 1000 - index * 100,
    value: 10000000000 - index * 1000000000,
  })),
  growth: Array.from({ length: 12 }, (_, index) => ({
    key: `month-${index}`,
    label: `${String(index + 1).padStart(2, "0")}/2026`,
    shortLabel: `${String(index + 1).padStart(2, "0")}/26`,
    quantity: index,
    value: index * 1000000,
    cumulativeQuantity: 5300 + index * 20,
    cumulativeValue: 458100000000 + index * 1000000000,
  })),
  missingRateCurrencies: ["USD", "EUR"],
};

const IT_STRUCTURE = {
  total: 640,
  items: [
    { key: "may-tinh", label: "Máy tính", value: 277 },
    { key: "thiet-bi-mang", label: "Thiết bị mạng", value: 195 },
  ],
};

describe("HomeAssetStructurePager", () => {
  it("dựng đủ ba trang, mỗi trang tự mang tiêu đề của nó", async () => {
    const tree = await mount(
      <HomeAssetStructurePager
        pageWidth={343}
        itStructure={IT_STRUCTURE}
        machine={MACHINE}
      />,
    );
    const labels = texts(tree);

    expect(labels).toContain("Cơ cấu máy móc");
    expect(labels).toContain("Tăng trưởng máy móc");
    expect(labels).toContain("Cơ cấu thiết bị CNTT");
    // Trang tăng trưởng: cột là số PHÁT SINH, còn luỹ kế nằm ở dòng "Hiện có".
    expect(labels).toContain("Thêm mới trong tháng (thiết bị)");
    expect(labels).toContain("Hiện có 5.578 thiết bị · 486,3 tỷ");
    // Mốc cuối là mặc định khi chưa chạm vào cột nào; tháng chỉ vài triệu thì
    // ghi "< 0,1" chứ không làm tròn thành "0 tỷ" (đọc như không mua gì).
    expect(labels).toContain("12/2026: +11 thiết bị · < 0,1 tỷ · luỹ kế 5.520");
    // Tiền hiện theo tỷ, không để nguyên số đồng 12 chữ số.
    expect(labels).toContain("5.578 · 486,3 tỷ");
    // Đơn vị nhiều hơn số dòng hiện thẳng thì phải có đường mở danh sách đầy đủ.
    expect(labels).toContain("Xem tất cả 8 đơn vị");
    // Tỷ giá thiếu thì phải cảnh báo, không thì người xem tưởng số đã đầy đủ.
    expect(
      labels.some((label) => label.includes("Chưa lấy được tỷ giá USD, EUR")),
    ).toBe(true);
  });

  it("endpoint máy móc lỗi thì hai trang đầu báo trống nhưng vẫn đủ ba trang", async () => {
    const tree = await mount(
      <HomeAssetStructurePager
        pageWidth={343}
        itStructure={IT_STRUCTURE}
        machine={null}
        hasMachineError
        onRetryMachine={() => undefined}
      />,
    );
    const labels = texts(tree);

    expect(
      labels.filter((label) => label === "Chưa lấy được số liệu máy móc."),
    ).toHaveLength(2);
    // Trang CNTT lấy nguồn khác nên không bị kéo theo.
    expect(labels).toContain("Cơ cấu thiết bị CNTT");
    expect(labels).toContain("Tổng cộng");
  });

  it("chưa có số máy móc thì nói rõ là chưa có, không phải lỗi", async () => {
    const tree = await mount(
      <HomeAssetStructurePager
        pageWidth={343}
        itStructure={IT_STRUCTURE}
        machine={{
          totalQuantity: 0,
          totalValue: 0,
          units: [],
          growth: [],
          missingRateCurrencies: [],
        }}
      />,
    );
    const labels = texts(tree);

    expect(labels).toContain("Chưa có máy móc nào đang được quản lý.");
    expect(labels).toContain("Chưa có số liệu tăng trưởng máy móc.");
  });
});
