import React from "react";
import { Platform, Pressable, Text } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import {
  buildMonthCells,
  formatLongDate,
  makeDay,
  shiftMonth,
  withYearMonth,
} from "../src/components/dataPicker/shared/calendarGrid";
import { DatePickerModal } from "../src/components/modal/Date/DatePickerModal";
import { TimePickerModal } from "../src/components/modal/Time/TimePickerModal";
import WheelColumn from "../src/components/dataPicker/shared/WheelColumn";

describe("calendarGrid", () => {
  it("lưới tháng 10/2026 bắt đầu từ Thứ Hai, ô trước ngày 1 để trống", () => {
    const cells = buildMonthCells(2026, 9);

    expect(cells).toHaveLength(42);
    // 01/10/2026 là Thứ Năm → cột thứ 4 (T2 T3 T4 [T5]).
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]?.getDate()).toBe(1);
    expect(cells[33]?.getDate()).toBe(31);
    expect(cells[34]).toBeNull();
  });

  it("lật tháng qua ranh giới năm", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("đổi sang tháng ngắn hơn thì hạ về ngày cuối tháng", () => {
    const moved = withYearMonth(makeDay(2026, 2, 31), 2026, 1);
    expect(moved.getMonth()).toBe(1);
    expect(moved.getDate()).toBe(28);
  });

  it("dòng tóm tắt ghi thứ bằng tiếng Việt", () => {
    expect(formatLongDate(makeDay(2026, 9, 22))).toBe("Thứ Năm, 22/10/2026");
  });
});

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  // Sheet còn animation đóng/mở chạy dở; gỡ cây trong `act` để nó không bắn
  // setState sau khi môi trường test đã dọn.
  await ReactTestRenderer.act(async () => {
    mounted.splice(0).forEach((tree) => tree.unmount());
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

const mount = async (node: React.ReactNode) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(wrap(node));
  });
  mounted.push(tree);
  return tree;
};

const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    <ThemeProvider>{node}</ThemeProvider>
  </SafeAreaProvider>
);

const pressByText = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string
) => {
  const text = tree.root
    .findAllByType(Text)
    .find((node) => node.props.children === label);
  if (!text) throw new Error(`Không thấy "${label}"`);

  let node: ReactTestRenderer.ReactTestInstance | null = text;
  while (node && node.type !== Pressable && !node.props.onPress) {
    node = node.parent;
  }
  if (!node) throw new Error(`"${label}" không bấm được`);

  await ReactTestRenderer.act(async () => {
    node!.props.onPress();
  });
};

describe("DatePickerModal", () => {
  it("chọn ngày trên lịch rồi Xác nhận trả về dd-MM-yyyy", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <DatePickerModal value="22-10-2026" onChange={onChange} />
    );

    await pressByText(tree, "22/10/2026");
    await pressByText(tree, 15 as unknown as string);
    expect(
      tree.root
        .findAllByType(Text)
        .some((node) => node.props.children === "Thứ Năm, 15/10/2026")
    ).toBe(true);

    await pressByText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("15-10-2026");
  });

  it("Huỷ thì không đổi giá trị", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <DatePickerModal value="22-10-2026" onChange={onChange} />
    );

    await pressByText(tree, "22/10/2026");
    await pressByText(tree, 3 as unknown as string);
    await pressByText(tree, "Huỷ");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("chọn tháng từ lưới tháng giữ nguyên ngày", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <DatePickerModal value="22-10-2026" onChange={onChange} />
    );

    await pressByText(tree, "22/10/2026");
    await pressByText(tree, "Tháng 10/2026");
    await pressByText(tree, "Tháng 3");
    await pressByText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("22-03-2026");
  });
});

describe("TimePickerModal", () => {
  it("bấm mốc giờ chọn nhanh rồi Xác nhận trả về HH:mm", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <TimePickerModal value="08:00" onChange={onChange} />
    );

    await pressByText(tree, "08:00");
    await pressByText(tree, "13:30");
    await pressByText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("13:30");
  });

  it("mở rồi Xác nhận ngay giữ nguyên giờ cũ", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <TimePickerModal value="17:05" onChange={onChange} />
    );

    await pressByText(tree, "17:05");
    await pressByText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("17:05");
  });
});

describe("bánh xe giờ theo nền tảng", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const openTime = async (value: string) => {
    const onChange = jest.fn();
    const tree = await mount(
      <TimePickerModal value={value} onChange={onChange} />
    );
    await pressByText(tree, value);
    return { tree, onChange };
  };

  it("iOS giữ UIDatePicker gốc, mốc giờ nhanh điều khiển nó", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    const { tree, onChange } = await openTime("08:00");

    expect(tree.root.findAllByType(WheelColumn)).toHaveLength(0);
    const spinner = () => tree.root.findByType(DateTimePicker);
    expect(spinner().props.display).toBe("spinner");
    expect(spinner().props.value.getHours()).toBe(8);

    await pressByText(tree, "17:00");
    expect(spinner().props.value.getHours()).toBe(17);

    // Xoay bánh xe gốc: sự kiện của UIDatePicker phải đổi giờ sẽ lưu.
    const picked = new Date();
    picked.setHours(9, 45, 0, 0);
    await ReactTestRenderer.act(async () => {
      spinner().props.onChange({ type: "set" }, picked);
    });
    await pressByText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("09:45");
  });

  it("Android dùng hai bánh xe tự vẽ", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const { tree } = await openTime("08:00");

    expect(tree.root.findAllByType(WheelColumn)).toHaveLength(2);
    expect(tree.root.findAllByType(DateTimePicker)).toHaveLength(0);
  });
});
