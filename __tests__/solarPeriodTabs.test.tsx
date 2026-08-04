import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { ThemeProvider } from "../src/context/ThemeContext";
import {
  getPeriodTabFontSize,
  PeriodHeader,
} from "../src/screens/Home/SolarPlantScreen.date";
import {
  createTodayDateRange,
  PERIOD_TAB_LABELS,
} from "../src/screens/Home/SolarPlantScreen.helpers";

// Hàng 5 tab kỳ có nhãn dài ngắn khác nhau ("Hôm nay" 7 ký tự, "Kỳ hoá đơn" 10).
// Lỗi đã gặp: chỉ tab đang chọn mới có lớp đệm của viên nền nên riêng nó hụt bề
// ngang và chữ xuống dòng.

describe("getPeriodTabFontSize", () => {
  it("nhỏ dần theo bề ngang màn hình", () => {
    expect(getPeriodTabFontSize(430)).toBe(13);
    expect(getPeriodTabFontSize(400)).toBe(13);
    expect(getPeriodTabFontSize(393)).toBe(12);
    expect(getPeriodTabFontSize(360)).toBe(12);
    expect(getPeriodTabFontSize(320)).toBe(11);
  });
});

describe("PeriodHeader", () => {
  const renderHeader = async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <PeriodHeader
            activeTab="Month"
            canGoNextRange={false}
            dateRange={createTodayDateRange()}
            isCurrentRange
            onChangeTab={() => {}}
            onGoCurrentRange={() => {}}
            onNextRange={() => {}}
            onOpenDatePicker={() => {}}
            onPreviousRange={() => {}}
          />
        </ThemeProvider>,
      );
    });

    return tree!;
  };

  it("mọi nhãn tab đều một dòng và cùng một cỡ chữ", async () => {
    const tree = await renderHeader();
    const labels = Object.values(PERIOD_TAB_LABELS);

    const tabTexts = tree.root
      .findAllByType("Text" as never)
      .filter((node) => labels.includes(node.props.children));

    expect(tabTexts).toHaveLength(labels.length);

    const resolvedFontSize = (style: unknown) =>
      ([] as unknown[])
        .concat(style)
        .map((entry) => (entry as { fontSize?: number } | null)?.fontSize)
        .filter((size) => size != null)
        .pop();

    tabTexts.forEach((node) => {
      // Chữ không được xuống dòng; hẹp quá thì thu nhỏ.
      expect(node.props.numberOfLines).toBe(1);
      expect(node.props.adjustsFontSizeToFit).toBe(true);
    });

    // Tab đang chọn phải cùng cỡ chữ với các tab khác, không có cỡ riêng.
    const sizes = tabTexts.map((node) => resolvedFontSize(node.props.style));
    expect(new Set(sizes).size).toBe(1);

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
