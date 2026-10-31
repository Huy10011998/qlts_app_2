import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import Ionicons from "react-native-vector-icons/Ionicons";

import { ThemeProvider } from "../src/context/ThemeContext";
import { createTabBarButton } from "../src/navigation/shared/TabBarItemButton";
import ScanTabButton from "../src/navigation/shared/ScanTabButton";
import { Circle, Rect } from "react-native-svg";

import { TAB_ACTIVE_COLOR } from "../src/navigation/shared/tabBarTheme";

/**
 * Trên tablet (chiều rộng ≥ 768) react-navigation truyền style xếp ngang cho
 * `tabBarButton` để nhãn nằm cạnh icon. Các ô tab ở đây tự vẽ icon + nhãn theo
 * chiều dọc, nên style đó không được thắng.
 */
const TABLET_ITEM_STYLE = {
  alignItems: "center" as const,
  flex: 1,
  flexDirection: "row" as const,
  justifyContent: "center" as const,
  padding: 5,
};

const mountedTrees: ReactTestRenderer.ReactTestRenderer[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mountedTrees.push(tree!);
  return tree!;
};

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const rootStyle = (tree: ReactTestRenderer.ReactTestRenderer) =>
  StyleSheet.flatten(
    tree.root.findByType(TouchableOpacity).props.style,
  ) as Record<string, unknown>;

describe("layout ô tab khi navigator xếp nhãn cạnh icon", () => {
  const HomeButton = createTabBarButton({
    label: "Trang chủ",
    icon: "home",
    iconOutline: "home-outline",
  });

  it("giữ chiều dọc cho ô tab thường", async () => {
    const tree = await mount(
      <HomeButton {...({ style: TABLET_ITEM_STYLE } as any)} />,
    );

    expect(rootStyle(tree).flexDirection).toBe("column");
  });

  it("giữ chiều dọc cho nút Quét QR", async () => {
    const tree = await mount(
      <ScanTabButton {...({ style: TABLET_ITEM_STYLE } as any)} />,
    );

    expect(rootStyle(tree).flexDirection).toBe("column");
  });

  const iconNames = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(Ionicons).map((node) => node.props.name);

  // Kiểu Facebook bản mới: chỉ có icon, tab đang chọn icon đầy màu nhấn trên
  // nền nhạt bo tròn. Nền vẽ bằng SVG — View bo góc trên thanh tab Android từng
  // ra hình vuông.
  it("tab đang chọn: icon đầy màu nhấn trên nền bo tròn vẽ bằng SVG", async () => {
    const tree = await mount(
      <HomeButton {...({ "aria-selected": true } as any)} />,
    );
    const [iconNode] = tree.root.findAllByType(Ionicons);
    const rects = tree.root.findAllByType(Rect);

    expect(iconNode.props.name).toBe("home");
    expect(iconNode.props.color).toBe(TAB_ACTIVE_COLOR);
    expect(rects).toHaveLength(1);
    expect(rects[0].props.rx).toBeGreaterThan(0);
  });

  it("tab không chọn: icon dạng viền, không có nền", async () => {
    const tree = await mount(<HomeButton {...({} as any)} />);

    expect(iconNames(tree)).toEqual(["home-outline"]);
    expect(tree.root.findAllByType(Rect)).toHaveLength(0);
  });

  // Không có chữ trên thanh tab nên tên tab chỉ còn ở nhãn trợ năng.
  it("không hiện chữ nhưng giữ tên tab cho trình đọc màn hình", async () => {
    const tree = await mount(<HomeButton {...({} as any)} />);
    const texts = tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children);

    expect(texts).not.toContain("Trang chủ");
    expect(tree.root.findByType(TouchableOpacity).props["aria-label"]).toBe(
      "Trang chủ",
    );
  });

  describe("số đỏ trên icon", () => {
    const makeButton = (badgeCount: number) =>
      createTabBarButton(
        { label: "Lịch", icon: "calendar", iconOutline: "calendar-outline" },
        () => ({ badgeCount }),
      );

    it("hiện số, quá 99 thì ghi 99+", async () => {
      const LichButton = makeButton(120);
      const tree = await mount(<LichButton {...({} as any)} />);
      const texts = tree.root
        .findAllByType(Text)
        .map((node) => node.props.children);

      expect(texts).toContain("99+");
    });

    // `{0 ? … : null}` thì an toàn, nhưng `{0 && …}` sẽ in chữ "0" ra thanh tab.
    it("0 thì không hiện", async () => {
      const LichButton = makeButton(0);
      const tree = await mount(<LichButton {...({} as any)} />);
      const texts = tree.root
        .findAllByType(Text)
        .flatMap((node) => node.props.children);

      expect(texts).not.toContain(0);
      expect(texts).not.toContain("0");
    });
  });

  describe("ảnh đại diện thay icon", () => {
    const SettingButton = createTabBarButton(
      { label: "Cài đặt", icon: "settings", iconOutline: "settings-outline" },
      () => ({ avatarUrl: "https://example.com/a.jpg" }),
    );

    it("có ảnh thì không hiện bánh răng, đang chọn thì có vòng đỏ", async () => {
      const tree = await mount(
        <SettingButton {...({ "aria-selected": true } as any)} />,
      );

      expect(tree.root.findAllByType(Image)).toHaveLength(1);
      expect(iconNames(tree)).toEqual([]);
      expect(tree.root.findByType(Circle).props.stroke).toBe(TAB_ACTIVE_COLOR);
    });

    it("ảnh lỗi thì quay về bánh răng", async () => {
      const tree = await mount(<SettingButton {...({} as any)} />);

      await ReactTestRenderer.act(async () => {
        tree.root.findByType(Image).props.onError();
      });

      expect(tree.root.findAllByType(Image)).toHaveLength(0);
      expect(iconNames(tree)).toEqual(["settings-outline"]);
    });
  });
});
