import React from "react";
import { Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import LichTodayIcon from "../src/screens/Workflow/Lich/LichTodayIcon";

describe("icon Hôm nay trên thanh chế độ Lịch", () => {
  afterEach(() => jest.useRealTimers());

  it("ghi số ngày thật, không phải 31 cứng của Ionicons", async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 29, 9, 0) });
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<LichTodayIcon color="#fff" />);
    });

    const text = tree.root.findByType(Text);
    expect(text.props.children).toBe(29);
    // Cỡ cố định như icon font: không nhân theo thanh Cỡ chữ.
    expect(text.props.allowFontScaling).toBe(false);
    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
