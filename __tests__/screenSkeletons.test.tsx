import React from "react";
import { Text, View } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import ProfileScreenSkeleton from "../src/screens/Profile/ProfileScreenSkeleton";
import CameraNotificationSkeleton from "../src/screens/Settings/shared/CameraNotificationSkeleton";
import ShareholdersMeetingSkeleton from "../src/screens/ShareholdersMeeting/shared/ShareholdersMeetingSkeleton";

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });

  return tree!;
};

const textsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");

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
