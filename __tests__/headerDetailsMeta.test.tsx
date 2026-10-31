import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import {
  HeaderDetails,
  HeaderDetailsModalHeader,
} from "../src/components/header/HeaderDetails";

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

const mockSetBellOpen = jest.fn();
let mockSoChuaDoc = 0;

jest.mock("../src/screens/ThongBao/ThongBaoProvider", () => ({
  useThongBaoContext: () => ({
    soChuaDoc: mockSoChuaDoc,
    setBellOpen: mockSetBellOpen,
  }),
}));

const renderBar = (
  title: string,
  props: Parameters<typeof HeaderDetails>[0],
  extraOptions: Record<string, unknown> = {},
) => {
  const header = HeaderDetails(props).header!;
  const navigation = {
    canGoBack: () => false,
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  return render(
    header({
      navigation,
      options: { title, ...extraOptions },
      route: { key: "root", name: "Root" },
      back: undefined,
    } as any) as React.ReactElement,
  );
};

/**
 * Các nút trên header theo thứ tự vẽ (nút tìm là Pressable, còn lại
 * TouchableOpacity). Pressable có lớp bọc nên một nút có thể khớp hai lần —
 * giữ lần đầu của mỗi nhãn.
 */
const headerButtons = (tree: ReactTestRenderer.ReactTestRenderer) => {
  const seen = new Set<string>();
  return tree.root
    .findAll(
      (node) =>
        typeof node.type !== "string" &&
        typeof node.props.onPress === "function" &&
        typeof node.props.accessibilityLabel === "string",
    )
    .filter((node) => {
      const label = node.props.accessibilityLabel as string;
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
};

const buttonLabels = (tree: ReactTestRenderer.ReactTestRenderer) =>
  headerButtons(tree).map((node) => node.props.accessibilityLabel);

/* Mọi header đều có ảnh nền nhà máy, nên tìm logo theo nhãn chứ không đếm
   `Image`. */
const logos = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Image)
    .filter((node) => node.props.accessibilityLabel === "Cholimex Foods");

describe("HeaderDetails – màn gốc của tab", () => {
  beforeEach(() => {
    mockSoChuaDoc = 0;
    mockSetBellOpen.mockClear();
  });

  it("logo thay nút quay lại, chuông nằm ngoài cùng bên phải", async () => {
    const tree = await renderBar("Hệ thống Camera", {
      tabRoot: true,
      helpTopicId: "camera",
    });

    expect(logos(tree)).toHaveLength(1);
    expect(buttonLabels(tree)).toEqual([
      "Hướng dẫn sử dụng màn hình này",
      "Thông báo",
    ]);
  });

  it("chuông hiện số chưa đọc và mở bảng chuông", async () => {
    mockSoChuaDoc = 120;
    const tree = await renderBar("Chức năng", {
      tabRoot: true,
      helpTopicId: "tong-quan",
    });
    const bell = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.props.accessibilityLabel?.startsWith("Thông báo"))!;

    expect(bell.props.accessibilityLabel).toBe("Thông báo, 120 chưa đọc");
    expect(texts(tree)).toContain("99+");

    await ReactTestRenderer.act(async () => bell.props.onPress());
    expect(mockSetBellOpen).toHaveBeenCalledWith(true);
  });

  it("màn chi tiết không có logo, không có chuông", async () => {
    const tree = await renderBar("Chi tiết", {
      showBackButton: true,
      helpTopicId: "camera",
    });

    expect(logos(tree)).toHaveLength(0);
    expect(buttonLabels(tree)).toEqual([
      "Quay lại",
      "Hướng dẫn sử dụng màn hình này",
    ]);
  });

  it("nhãn cố định thay nhãn đoán theo tiêu đề", async () => {
    const tree = await renderBar("Chức năng", {
      tabRoot: true,
      badge: { label: "Danh mục", icon: "grid-outline" },
    });

    expect(texts(tree)).toContain("Danh mục");
    expect(texts(tree)).not.toContain("Thông tin");
  });

  describe("nhãn ngày hôm nay", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("hiện thứ + ngày, qua nửa đêm tự sang ngày mới", async () => {
      jest.useFakeTimers({ now: new Date(2026, 9, 29, 22, 30) });
      const tree = await renderBar("Lịch công việc", {
        tabRoot: true,
        badge: "today",
      });

      expect(texts(tree)).toContain("Thứ 5 · 29/10");

      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });

      expect(texts(tree)).toContain("Thứ 6 · 30/10");
    });
  });
});

describe("HeaderDetails – nút tìm kiếm do màn gắn", () => {
  it("nằm trước dấu hỏi và chuông, bấm gọi về màn", async () => {
    const onPress = jest.fn();
    const tree = await renderBar(
      "Chức năng",
      { tabRoot: true, helpTopicId: "tong-quan" },
      { headerSearch: { active: false, onPress } },
    );

    expect(buttonLabels(tree)).toEqual([
      "Tìm kiếm",
      "Hướng dẫn sử dụng màn hình này",
      "Thông báo",
    ]);

    const button = headerButtons(tree).find(
      (node) => node.props.accessibilityLabel === "Tìm kiếm",
    )!;
    await ReactTestRenderer.act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("đang mở ô tìm thì đổi nhãn thành Đóng tìm kiếm", async () => {
    const tree = await renderBar(
      "Danh sách",
      { showBackButton: true },
      { headerSearch: { active: true, onPress: jest.fn() } },
    );
    const button = headerButtons(tree).find(
      (node) => node.props.accessibilityLabel === "Đóng tìm kiếm",
    )!;

    expect(button.props.accessibilityState).toEqual({ expanded: true });
  });

  // Nút đổi trạng thái ngay lúc đang nhấn: TouchableOpacity khi đó kẹt lại độ
  // mờ dở dang (đóng ô tìm rồi icon vẫn nhạt). Pressable + style có sẵn giá trị
  // nền / độ mờ ở mọi trạng thái thì không có gì để kẹt.
  it("là Pressable, nền và độ mờ luôn có giá trị ở mọi trạng thái", async () => {
    const styleOf = async (active: boolean, pressed: boolean) => {
      const tree = await renderBar(
        "Danh sách",
        { showBackButton: true },
        { headerSearch: { active, onPress: jest.fn() } },
      );
      const button = tree.root.findAll(
        (node) =>
          typeof node.props.style === "function" &&
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.includes("ìm kiếm"),
      )[0];
      return StyleSheet.flatten(button.props.style({ pressed }));
    };

    expect(await styleOf(false, false)).toMatchObject({
      backgroundColor: "transparent",
      opacity: 1,
    });
    expect(await styleOf(true, false)).toMatchObject({
      backgroundColor: "rgba(255,255,255,0.22)",
      opacity: 1,
    });
    expect((await styleOf(false, true)).opacity).toBe(0.5);
  });
});
