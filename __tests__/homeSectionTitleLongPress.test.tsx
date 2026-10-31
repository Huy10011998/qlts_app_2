import React from "react";
import { TouchableOpacity } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import HomeSectionTitle from "../src/screens/Home/shared/HomeSectionTitle";
import { HOME_BLOCK_TONES } from "../src/screens/Home/shared/homeBlockTone";

const render = async (props: Partial<React.ComponentProps<typeof HomeSectionTitle>>) => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <HomeSectionTitle
          label="SỐ LIỆU"
          tone={HOME_BLOCK_TONES.stats}
          iconName="stats-chart"
          {...props}
        />
      </ThemeProvider>,
    );
  });
  return tree!.root.findAllByType(TouchableOpacity)[0];
};

describe("HomeSectionTitle – đè giữ nhãn", () => {
  beforeEach(() => jest.mocked(ReactNativeHapticFeedback.trigger).mockClear());

  it("có onLongPress: đè giữ gọi gập/mở tất cả (kèm rung), chạm vẫn chỉ gập khối này", async () => {
    const onToggleCollapsed = jest.fn();
    const onLongPress = jest.fn();
    const tab = await render({ onToggleCollapsed, onLongPress });

    await ReactTestRenderer.act(async () => tab.props.onLongPress());
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onToggleCollapsed).not.toHaveBeenCalled();
    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => tab.props.onPress());
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    expect(tab.props.accessibilityHint).toContain("Đè giữ để thu gọn hoặc mở tất cả");
  });

  it("không có onLongPress: đè giữ cũng chỉ gập khối này, không rung", async () => {
    const onToggleCollapsed = jest.fn();
    const tab = await render({ onToggleCollapsed });

    await ReactTestRenderer.act(async () => tab.props.onLongPress());
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    expect(ReactNativeHapticFeedback.trigger).not.toHaveBeenCalled();
  });
});
