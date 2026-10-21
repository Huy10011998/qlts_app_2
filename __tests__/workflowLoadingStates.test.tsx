import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import EmployeePickerModal from "../src/screens/Workflow/shared/components/EmployeePickerModal";
import WorkflowFormSkeleton from "../src/screens/Workflow/shared/components/WorkflowFormSkeleton";
import type { WorkflowEmployee } from "../src/types/index";

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

  mounted.push(tree!);

  return tree!;
};

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

const byLabel = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    (node) => node.type === View && node.props.accessibilityLabel === label,
  );

const picker = (props: Partial<React.ComponentProps<typeof EmployeePickerModal>>) => (
  <EmployeePickerModal
    visible
    title="Chọn chủ trì mới"
    employees={[]}
    selectedIds={[]}
    multiple={false}
    onClose={() => undefined}
    onConfirm={() => undefined}
    {...props}
  />
);

describe("bảng chọn nhân viên lúc danh sách chưa về", () => {
  // Đổi chủ trì gọi API lúc mở sheet: bấm chọn ngay thì danh sách còn rỗng —
  // trước đây hiện "Không có nhân viên để chọn" như thể công ty không có ai.
  it("đang tải thì hiện khung chờ, không báo rỗng", async () => {
    const tree = await mount(picker({ loading: true }));

    expect(byLabel(tree, "Đang tải danh sách nhân viên")).toHaveLength(1);
    expect(textsOf(tree)).not.toContain("Không có nhân viên để chọn");
  });

  it("tải hỏng thì báo lỗi và cho thử lại", async () => {
    const onRetry = jest.fn();
    const tree = await mount(picker({ errorMessage: "Mất kết nối", onRetry }));

    expect(textsOf(tree)).toContain("Không tải được danh sách nhân viên");
    expect(textsOf(tree)).not.toContain("Không có nhân viên để chọn");

    const retry = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) =>
        node.findAllByType(Text).some((text) => text.props.children === "Thử lại"),
      );

    await ReactTestRenderer.act(async () => {
      retry!.props.onPress();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Ba nơi gọi còn lại truyền sẵn danh sách đã tải và không biết tới hai prop mới.
  it("không truyền trạng thái tải thì vẫn như cũ", async () => {
    const employees = [
      { id: 1, ten: "Nguyễn Văn An", ma: "NV01" },
    ] as unknown as WorkflowEmployee[];

    const filled = await mount(picker({ employees }));
    const empty = await mount(picker({}));

    expect(textsOf(filled)).toContain("Nguyễn Văn An");
    expect(byLabel(filled, "Đang tải danh sách nhân viên")).toHaveLength(0);
    expect(textsOf(empty)).toContain("Không có nhân viên để chọn");
  });
});

describe("khung chờ form Workflow", () => {
  // Thanh lưu dưới đáy là của `AssetFormScreenShell`, có ở cả ba form — khung
  // chờ thiếu nó thì dải trắng ~98pt bật lên lúc form thật thay vào.
  const buttonShellsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(
      (node) =>
        node.type === View &&
        [node.props.style].flat(3).some((style) => style?.minHeight === 44),
    ).length;

  it("vẽ thanh lưu với đúng số nút của form", async () => {
    const single = await mount(<WorkflowFormSkeleton />);
    const flow = await mount(
      <WorkflowFormSkeleton flowName footerButtons={["neutral", "primary"]} />,
    );

    expect(buttonShellsOf(single)).toBe(1);
    expect(buttonShellsOf(flow)).toBe(2);
  });

  it("phần đầu biết trước thì vẽ thật phía trên các nhóm", async () => {
    const tree = await mount(
      <WorkflowFormSkeleton header={<Text>Giao công việc từ phiếu PDN.0001</Text>} />,
    );

    expect(textsOf(tree)).toContain("Giao công việc từ phiếu PDN.0001");
  });
});
