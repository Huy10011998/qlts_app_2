import React from "react";
import { Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import SettingProfileCard from "../src/screens/Settings/shared/SettingProfileCard";

/* Thẻ hồ sơ đỏ đầu màn Cài đặt, dựng theo thẻ tài khoản VCB. */
const render = (props: Partial<React.ComponentProps<typeof SettingProfileCard>>) => {
  const handlers = {
    onPress: jest.fn(),
    onQrPress: jest.fn(),
    onChangePasswordPress: jest.fn(),
  };
  let tree: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SettingProfileCard {...handlers} {...props} />,
    );
  });
  return { tree: tree!, handlers };
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((child) => typeof child === "string");

/** Nút bấm trong cùng có chữ / nhãn trợ năng này. */
const pressable = (tree: ReactTestRenderer.ReactTestRenderer, text: string) =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type !== "string" &&
        typeof node.props.onPress === "function" &&
        (node.props.accessibilityLabel === text ||
          node.findAll((child) => child.props.children === text).length > 0),
    )
    .pop();

describe("SettingProfileCard", () => {
  it("hiện TÊN in hoa, chức danh, Mã NV và Bộ phận", () => {
    const { tree } = render({
      name: "Nguyễn Văn An",
      title: "Chuyên viên IT",
      code: "CLX00123",
      unit: "Phòng CNTT",
    });

    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        "NGUYỄN VĂN AN",
        "Chuyên viên IT",
        "Mã NV",
        "CLX00123",
        "Bộ phận",
        "Phòng CNTT",
        "VA",
      ]),
    );
  });

  it("thiếu dữ liệu thì hiện chỗ trống cố định, thẻ không đổi cỡ", () => {
    const { tree } = render({});

    expect(texts(tree)).toEqual(
      expect.arrayContaining(["---", "Thành viên", "—"]),
    );
  });

  it("nút QR, Hồ sơ cá nhân, Đổi mật khẩu gọi đúng việc", () => {
    const { tree, handlers } = render({ name: "Nguyễn Văn An" });

    ReactTestRenderer.act(() => {
      pressable(tree, "Danh thiếp QR")!.props.onPress();
      pressable(tree, "Hồ sơ cá nhân")!.props.onPress();
      pressable(tree, "Đổi mật khẩu")!.props.onPress();
    });

    expect(handlers.onQrPress).toHaveBeenCalledTimes(1);
    expect(handlers.onPress).toHaveBeenCalledTimes(1);
    expect(handlers.onChangePasswordPress).toHaveBeenCalledTimes(1);
  });
});
