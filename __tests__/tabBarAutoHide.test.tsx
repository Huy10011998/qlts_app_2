import React from "react";
import { Animated } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import {
  TabBarAutoHideContext,
  useHideTabBarOnScroll,
} from "../src/navigation/shared/tabBarAutoHide";

jest.mock("@react-navigation/native", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    ...jest.requireActual("@react-navigation/native"),
    // Không có navigator: coi như màn được focus lúc mount, blur lúc unmount.
    useFocusEffect: (effect: () => void | (() => void)) =>
      useEffect(effect, [effect]),
  };
});

const setHidden = jest.fn();
let onScroll: ReturnType<typeof useHideTabBarOnScroll>;

function Screen() {
  onScroll = useHideTabBarOnScroll();
  return null;
}

/** Mặc định trang dài 3000, khung nhìn 800: đáy ở y = 2200. */
const scrollTo = (y: number, contentHeight = 3000) =>
  onScroll({
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 390, height: contentHeight },
      layoutMeasurement: { width: 390, height: 800 },
    },
  } as any);

const lastHidden = () => setHidden.mock.calls[setHidden.mock.calls.length - 1]?.[0];

const render = async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <TabBarAutoHideContext.Provider
        value={{ progress: new Animated.Value(0), setHidden }}
      >
        <Screen />
      </TabBarAutoHideContext.Provider>,
    );
  });
  return tree!;
};

describe("useHideTabBarOnScroll", () => {
  beforeEach(() => setHidden.mockClear());

  it("đọc xuống quá ngưỡng thì ẩn, phải kéo ngược lên một đoạn dài mới hiện", async () => {
    await render();

    scrollTo(100);
    expect(lastHidden()).toBe(true);

    scrollTo(600);
    scrollTo(560); // nhích lên 40: chưa đủ ngưỡng
    expect(lastHidden()).toBe(true);
    scrollTo(620); // đọc tiếp: mốc dời về điểm sâu nhất mới
    scrollTo(530); // cách 620 mới 90
    expect(lastHidden()).toBe(true);

    scrollTo(510); // cách điểm sâu nhất (620) 110
    expect(lastHidden()).toBe(false);
  });

  it("cuộn rung nhẹ quanh một chỗ thì không nháy", async () => {
    await render();

    [300, 306, 300, 308, 302].forEach((y) => scrollTo(y));
    // 300 là lần đầu vượt ngưỡng từ 0 → ẩn; các nhịp sau không đổi gì.
    expect(setHidden).toHaveBeenCalledTimes(1);
  });

  it("về gần đầu trang (kể cả kéo làm mới, y âm) thì hiện", async () => {
    await render();

    scrollTo(500);
    expect(lastHidden()).toBe(true);
    scrollTo(-60);
    expect(lastHidden()).toBe(false);
  });

  it("kéo quá đáy rồi buông (iOS nảy về đáy) thì không nháy", async () => {
    await render();

    scrollTo(1500);
    expect(lastHidden()).toBe(true);
    // Đáy ở 2200 (3000 - 800): kéo quá, nảy về, kéo quá lần nữa.
    [2200, 2260, 2320, 2240, 2200, 2280, 2200].forEach((y) => scrollTo(y));
    expect(setHidden).toHaveBeenCalledTimes(1);
    expect(lastHidden()).toBe(true);
  });

  it("trang ngắn lại làm y lùi theo thì không coi là kéo lên", async () => {
    await render();

    scrollTo(2000);
    expect(lastHidden()).toBe(true);
    // Trang còn 2500 → đáy 1700: y bị kéo lùi 300 mà người dùng không kéo.
    scrollTo(1700, 2500);
    expect(lastHidden()).toBe(true);
    scrollTo(1590, 2500); // kéo lên thật 110 từ mốc mới
    expect(lastHidden()).toBe(false);
  });

  it("rời màn thì trả thanh tab về hiện", async () => {
    const tree = await render();

    scrollTo(900);
    expect(lastHidden()).toBe(true);
    await ReactTestRenderer.act(async () => tree.unmount());
    expect(lastHidden()).toBe(false);
  });
});
