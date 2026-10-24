import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { readStoredAuthUsername } from "../src/context/authStorage";
import { useHomeBlockOrder } from "../src/screens/Home/shared/useHomeBlockOrder";
import { useStoredHomeBlockList } from "../src/screens/Home/shared/useStoredHomeBlockList";
import { getHomeBlockListKey } from "../src/screens/Home/shared/homeBlockLists";
import { DEFAULT_HOME_BLOCK_ORDER, getHomeBlockOrderKey } from "../src/screens/Home/shared/homeBlockOrder";

jest.mock("../src/context/authStorage", () => ({ readStoredAuthUsername: jest.fn() }));

const mockReadUsername = readStoredAuthUsername as jest.Mock;

// Trang chủ giữ khung chờ tới khi `isLoading` tắt: phải tắt cả khi đọc lỗi,
// và lúc tắt thì cài đặt đã nằm sẵn trong state (không có khung nào thứ tự sai).
const renders: unknown[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  tree!.unmount();
};

beforeEach(async () => {
  renders.length = 0;
  mockReadUsername.mockReset();
  await AsyncStorage.clear();
});

function OrderProbe() {
  const { blockOrder, isLoading } = useHomeBlockOrder();
  renders.push({ first: blockOrder[0], isLoading });
  return null;
}

function HiddenProbe() {
  const { keys, isLoading } = useStoredHomeBlockList("@test/hidden");
  renders.push({ keys, isLoading });
  return null;
}

it("thứ tự khối: đang đọc thì isLoading, đọc xong có ngay thứ tự đã lưu", async () => {
  mockReadUsername.mockResolvedValue("test1");
  const reversed = [...DEFAULT_HOME_BLOCK_ORDER].reverse();
  await AsyncStorage.setItem(getHomeBlockOrderKey("test1"), JSON.stringify(reversed));

  await mount(<OrderProbe />);

  expect(renders[0]).toEqual({ first: DEFAULT_HOME_BLOCK_ORDER[0], isLoading: true });
  expect(renders[renders.length - 1]).toEqual({ first: reversed[0], isLoading: false });
});

it("khối ẩn: đọc xong thì có danh sách ngay lúc tắt isLoading", async () => {
  mockReadUsername.mockResolvedValue("test1");
  await AsyncStorage.setItem(getHomeBlockListKey("@test/hidden", "test1"), JSON.stringify(["attendance"]));

  await mount(<HiddenProbe />);

  expect(renders[0]).toEqual({ keys: [], isLoading: true });
  expect(renders[renders.length - 1]).toEqual({ keys: ["attendance"], isLoading: false });
});

it("đọc lỗi vẫn tắt isLoading — Trang chủ không kẹt khung chờ", async () => {
  mockReadUsername.mockRejectedValue(new Error("keychain"));

  await mount(<OrderProbe />);
  await mount(<HiddenProbe />);

  expect(renders.filter((r) => !(r as { isLoading: boolean }).isLoading)).toHaveLength(2);
});
