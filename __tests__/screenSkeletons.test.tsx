import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import FeaturesScreenSkeleton from "../src/screens/Home/shared/FeaturesScreenSkeleton";
import HomeScreenSkeleton from "../src/screens/Home/shared/HomeScreenSkeleton";
import HomeSectionTitle from "../src/screens/Home/shared/HomeSectionTitle";
import HomeStatTiles from "../src/screens/Home/shared/HomeStatTiles";
import { HOME_BLOCK_TONES } from "../src/screens/Home/shared/homeBlockTone";
import SolarPlantSkeleton from "../src/screens/Home/shared/SolarPlantSkeleton";
import { ChartSkeleton } from "../src/screens/Home/SolarPlantScreen.visuals";
import ProfileScreenSkeleton from "../src/screens/Profile/ProfileScreenSkeleton";
import SettingScreenSkeleton from "../src/screens/Settings/shared/SettingScreenSkeleton";
import { C } from "../src/utils/helpers/colors";
import CameraNotificationSkeleton from "../src/screens/Settings/shared/CameraNotificationSkeleton";
import ShareholdersMeetingSkeleton from "../src/screens/ShareholdersMeeting/shared/ShareholdersMeetingSkeleton";

// `ShareholdersMeetingSkeleton` chạy vòng nhấp nháy, chỉ dừng khi unmount — còn
// sống thì Jest không thoát được worker. Hai file test khung chờ kia đã có sẵn
// phần tháo này; file này thiếu.
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
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  mounted.push(tree!);

  return tree!;
};

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

/** Mọi màu mép trên 3pt đang vẽ trong cây — dấu của khung card màu nhóm. */
const topAccentsOf = (node: ReactTestRenderer.ReactTestInstance) =>
  node
    .findAllByType(View)
    .map((view) => StyleSheet.flatten(view.props.style))
    .filter((style) => style?.borderTopWidth === 3)
    .map((style) => style.borderTopColor);

// Nhãn của mấy màn này là chuỗi cố định trong code, không phải dữ liệu BE — nên
// khung chờ nói được luôn "sắp hiện những mục này" thay vì tô xám tất cả. Test
// khoá đúng chỗ đó: đổi danh sách mục ở màn thật mà quên sửa khung chờ thì hai
// bên lệch nhau và khung chờ sẽ nhảy một nhịp khi dữ liệu về.
describe("khung chờ màn Hồ sơ", () => {
  it("hiện nhãn thật của từng mục", async () => {
    const texts = textsOf(await mount(<ProfileScreenSkeleton />));

    expect(texts).toContain("THÔNG TIN CƠ BẢN");
    expect(texts).toContain("Họ và tên");
    expect(texts).toContain("Email");
    expect(texts).toContain("ĐƠN VỊ CÔNG TÁC");
    expect(texts).toContain("Phòng ban");
    expect(texts).toContain("CHỨC VỤ & DANH HIỆU");
  });
});

describe("khung chờ Thông báo camera", () => {
  it("hiện đúng ba nhóm của màn thật", async () => {
    const texts = textsOf(await mount(<CameraNotificationSkeleton />));

    expect(texts).toEqual([
      "TRẠNG THÁI",
      "TẠM DỪNG NHẬN THÔNG BÁO",
      "TẮT CHO CẢ CÔNG TY",
    ]);
  });
});

describe("khung chờ Đại hội cổ đông", () => {
  // Hai tab dẫn tới hai bố cục khác nhau: điểm danh có ô tìm kiếm + danh sách,
  // lấy ý kiến có khối chọn ý kiến.
  it("hai biến thể dựng khác nhau", async () => {
    const attendance = await mount(<ShareholdersMeetingSkeleton />);
    const voting = await mount(
      <ShareholdersMeetingSkeleton variant="voting" />,
    );

    const countBlocks = (tree: ReactTestRenderer.ReactTestRenderer) =>
      tree.root.findAllByType(View).length;

    expect(countBlocks(attendance)).not.toBe(countBlocks(voting));
  });
});

describe("khung chờ Trang chủ", () => {
  // Thiếu nhãn khối là khung chờ ngắn hơn trang thật cả trăm điểm — nhãn phải ra
  // đúng khối, đúng thứ tự HomeScreen truyền vào.
  it("dựng nhãn màu từng khối theo đúng thứ tự được truyền", async () => {
    const tree = await mount(
      <HomeScreenSkeleton blockKeys={["shortcuts", "stats", "utilities"]} />,
    );

    expect(
      tree.root.findAllByType(HomeSectionTitle).map((node) => node.props.label),
    ).toEqual([
      "TRUY CẬP NHANH",
      "SỐ LIỆU TOÀN CÔNG TY",
      "TIÊU THỤ ĐIỆN · NƯỚC · HƠI",
    ]);
  });

  it("khối đang thu gọn chỉ còn dòng tiêu đề", async () => {
    const tree = await mount(
      <HomeScreenSkeleton
        blockKeys={["stats", "shortcuts"]}
        collapsedKeys={["stats"]}
      />,
    );

    expect(tree.root.findAllByType(HomeStatTiles)).toHaveLength(0);
    expect(textsOf(tree)).toContain("Đã thu gọn");
  });

  // Lưới số liệu nằm ngoài context màu khối thì ô chờ ra viền xám trung tính,
  // trong khi ô thật viền xanh của khối Số liệu.
  it("ô chờ của lưới số liệu mang màu khối Số liệu", async () => {
    const tree = await mount(
      <HomeScreenSkeleton blockKeys={["stats"]} statTileCount={2} />,
    );
    const [tiles] = tree.root.findAllByType(HomeStatTiles);

    expect(topAccentsOf(tiles)).toEqual([
      HOME_BLOCK_TONES.stats.label,
      HOME_BLOCK_TONES.stats.label,
    ]);
  });
});

describe("khung chờ tab Chức năng", () => {
  it("ba nhóm cố định, viền theo màu nhóm như màn thật", async () => {
    const tree = await mount(<FeaturesScreenSkeleton />);

    expect(textsOf(tree)).toEqual(["Tiện ích", "Phương tiện", "Báo cáo"]);
    expect(topAccentsOf(tree.root)).toEqual(["#E31E24", "#0EA5E9", "#7C3AED"]);
  });
});

describe("khung chờ Cài đặt", () => {
  // Thẻ nhóm dựng bằng chính `SettingSectionGroup`: viền đỏ cho 5 nhóm, hồng cho
  // Đăng xuất — đúng `accent` màn thật truyền.
  it("hai thẻ mang đúng màu viền của màn thật", async () => {
    const tree = await mount(<SettingScreenSkeleton safeTop={0} />);

    expect(topAccentsOf(tree.root)).toEqual([C.red, C.rose]);
  });
});

describe("khung chờ Điện mặt trời", () => {
  // Hai khối biểu đồ dùng lại khung chờ biểu đồ của màn thật, không vẽ bản sao.
  it("dựng được và dùng ChartSkeleton cho hai khối biểu đồ", async () => {
    const tree = await mount(<SolarPlantSkeleton />);

    expect(tree.root.findAllByType(ChartSkeleton)).toHaveLength(2);
  });
});
