import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import AssetDetailsSkeleton from "../src/components/assets/shared/AssetDetailsSkeleton";
import type { Field } from "../src/types/index";
import { TypeProperty } from "../src/utils/Enum";
import { TAB_ITEMS } from "../src/utils/Helper";

let mockAllowAttach = true;

// Thanh tab của khung chờ là `DetailSectionTabs` thật: tự lọc mục Tệp theo quyền
// của class đang xem, như lúc có dữ liệu.
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

// Vòng nhấp nháy chỉ dừng khi unmount; còn sống thì Jest không thoát được.
let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

beforeEach(() => {
  mockAllowAttach = true;
});

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

const field = (
  name: string,
  moTa: string,
  typeProperty = TypeProperty.Text,
  isReadOnly = false,
) => ({ name, moTa, groupLayout: "", typeProperty, isReadOnly }) as unknown as Field;

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

// Lọc host node: TouchableOpacity dựng vài lớp bọc cùng mang prop.
const tabsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      typeof node.type === "string" && node.props.accessibilityRole === "tab",
  );

const valueBlocksOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Animated.View)
    .map((node) => StyleSheet.flatten(node.props.style));

describe("thanh tab của khung chờ chi tiết", () => {
  // Đúng số mục thật (4 khi thiếu quyền Tệp), không thì lúc dữ liệu về thanh tab
  // đổi hình.
  it("dựng đúng các mục được hiện theo quyền", async () => {
    const five = await mount(
      <AssetDetailsSkeleton groupedFields={{}} tabs={TAB_ITEMS} />,
    );
    expect(tabsOf(five)).toHaveLength(5);

    mockAllowAttach = false;
    const four = await mount(
      <AssetDetailsSkeleton groupedFields={{}} tabs={TAB_ITEMS} />,
    );
    expect(tabsOf(four)).toHaveLength(4);
  });

  // Mở thẳng vào tab khác thì viên đỏ (và nhãn) nằm đúng tab đó.
  it("viên đang chọn theo activeTab", async () => {
    const tree = await mount(
      <AssetDetailsSkeleton
        groupedFields={{ "Thông tin chung": [field("ma", "Mã thiết bị")] }}
        tabs={TAB_ITEMS}
        activeTab="details"
      />,
    );

    const selected = tree.root
      .findAllByType(TouchableOpacity)
      .filter((node) => node.props["aria-selected"] === true);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe("Chi tiết");

    // Tab Chi tiết không phải trang field: không vẽ thẻ nhóm của tab Thông tin.
    expect(textsOf(tree)).not.toContain("Mã thiết bị");
  });
});

describe("thân khung chờ tab Thông tin", () => {
  it("hàng nút tên nhóm chỉ có từ hai nhóm", async () => {
    const one = await mount(
      <AssetDetailsSkeleton
        groupedFields={{ "Thông tin chung": [field("ma", "Mã thiết bị")] }}
      />,
    );
    // Một nhóm: tên nhóm chỉ ở đầu thẻ.
    expect(textsOf(one).filter((t) => t === "Thông tin chung")).toHaveLength(1);

    const two = await mount(
      <AssetDetailsSkeleton
        groupedFields={{
          "Thông tin chung": [field("ma", "Mã thiết bị")],
          "Bảo hành": [field("bh", "Hạn bảo hành")],
        }}
      />,
    );
    // Hai nhóm: thêm một lần ở hàng nút.
    expect(textsOf(two).filter((t) => t === "Thông tin chung")).toHaveLength(2);
    expect(textsOf(two).filter((t) => t === "Bảo hành")).toHaveLength(2);
  });

  // Ảnh base64 là ô vuông nhỏ (64) hoặc ô QR (108), chỉ ảnh file mới là khung 4:3.
  it("ô giá trị ảnh đúng cỡ theo loại field", async () => {
    const tree = await mount(
      <AssetDetailsSkeleton
        groupedFields={{
          "Hình ảnh": [
            field("anh", "Ảnh", TypeProperty.Image),
            field("chuKy", "Chữ ký", TypeProperty.ImageBase64),
            field("qr", "QR", TypeProperty.ImageBase64, true),
          ],
        }}
      />,
    );

    const [image, thumb, qr] = valueBlocksOf(tree);
    expect(image.aspectRatio).toBe(4 / 3);
    expect([thumb.width, thumb.height]).toEqual([64, 64]);
    expect([qr.width, qr.height]).toEqual([108, 108]);
  });
});
