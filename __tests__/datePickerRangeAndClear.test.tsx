import React from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import {
  clampDay,
  isDayOutOfRange,
  isMonthOutOfRange,
  makeDay,
} from "../src/components/dataPicker/shared/calendarGrid";
import {
  findFieldKey,
  formatPickerDisplayDate,
  nextRangeEnd,
  parsePickerDate,
} from "../src/components/dataPicker/shared/pickerValue";
import CalendarPanel from "../src/components/dataPicker/shared/CalendarPanel";
import PlaybackDateSheet from "../src/components/camera/shared/PlaybackDateSheet";
import { DatePickerModal } from "../src/components/modal/Date/DatePickerModal";
import { TimePickerModal } from "../src/components/modal/Time/TimePickerModal";
import { RenderInputByType } from "../src/components/form/RenderInputByType";
import { SolarDateRangePicker } from "../src/screens/Home/SolarPlantScreen.date";
import { TypeProperty } from "../src/utils/Enum";

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/** "Hôm nay" cố định để ngày tương lai / quá khứ trong test không trôi theo lịch thật. */
const NOW = new Date(2026, 9, 22, 9, 0, 0);

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.splice(0).forEach((tree) => tree.unmount());
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

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

const mount = async (node: React.ReactNode) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(wrap(node));
  });
  mounted.push(tree);
  return tree;
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((node) => node.props.children);

/** Nút bấm có `accessibilityLabel` đúng bằng `label` (ô ngày: "Thứ Năm, 22/10/2026"). */
const byLabel = (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const node = tree.root.find(
    (item) =>
      item.props.accessibilityLabel === label &&
      typeof item.props.onPress === "function"
  );
  return node;
};

const press = async (node: ReactTestRenderer.ReactTestInstance) => {
  await ReactTestRenderer.act(async () => {
    node.props.onPress();
  });
};

const pressText = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string | number
) => {
  const text = tree.root
    .findAllByType(Text)
    .find((node) => node.props.children === label);
  if (!text) throw new Error(`Không thấy "${label}"`);
  let node: ReactTestRenderer.ReactTestInstance | null = text;
  while (node && typeof node.props.onPress !== "function") node = node.parent;
  if (!node) throw new Error(`"${label}" không bấm được`);
  await press(node);
};

describe("giá trị ô ngày", () => {
  it("đọc được cả dd-MM-yyyy lẫn chuỗi thô của BE", () => {
    expect(parsePickerDate("05-03-2026")?.getDate()).toBe(5);
    expect(parsePickerDate("2026-03-05T00:00:00")?.getMonth()).toBe(2);
    expect(parsePickerDate("")).toBeNull();
    expect(parsePickerDate("abc")).toBeNull();
  });

  it("ô chỉ hiển thị dạng dd/MM/yyyy, chuỗi lạ để nguyên", () => {
    expect(formatPickerDisplayDate("22-10-2026")).toBe("22/10/2026");
    expect(formatPickerDisplayDate("2026-10-22")).toBe("2026-10-22");
    expect(formatPickerDisplayDate(undefined)).toBeUndefined();
  });

  it("Từ ngày vượt Đến ngày thì Đến ngày dời về bằng Từ ngày", () => {
    expect(nextRangeEnd("25-10-2026", "20-10-2026")).toBe("25-10-2026");
    expect(nextRangeEnd("15-10-2026", "20-10-2026")).toBe("20-10-2026");
    expect(nextRangeEnd("15-10-2026", "")).toBe("");
    expect(nextRangeEnd("", "20-10-2026")).toBe("20-10-2026");
  });

  it("tìm khoá trường không phân biệt hoa thường", () => {
    expect(findFieldKey({ tuNgay: "x" }, "tungay")).toBe("tuNgay");
    expect(findFieldKey({ TuNgay: "x" }, "tungay")).toBe("TuNgay");
    expect(findFieldKey(undefined, "tungay")).toBeUndefined();
  });
});

describe("khoảng ngày cho phép", () => {
  const limits = { minDate: makeDay(2026, 9, 20), maxDate: makeDay(2026, 9, 25) };

  it("so theo ngày, bỏ qua giờ", () => {
    expect(isDayOutOfRange(new Date(2026, 9, 20, 23, 59), limits)).toBe(false);
    expect(isDayOutOfRange(makeDay(2026, 9, 19), limits)).toBe(true);
    expect(isDayOutOfRange(makeDay(2026, 9, 26), limits)).toBe(true);
  });

  it("tháng chỉ ngoài khoảng khi không còn ngày nào chọn được", () => {
    expect(isMonthOutOfRange(2026, 9, limits)).toBe(false);
    expect(isMonthOutOfRange(2026, 8, limits)).toBe(true);
    expect(isMonthOutOfRange(2026, 10, limits)).toBe(true);
  });

  it("kéo ngày về trong khoảng", () => {
    expect(clampDay(makeDay(2026, 9, 1), limits).getDate()).toBe(20);
    expect(clampDay(makeDay(2026, 11, 1), limits).getDate()).toBe(25);
    expect(clampDay(makeDay(2026, 9, 22), limits).getDate()).toBe(22);
  });
});

describe("DatePickerModal: minDate", () => {
  it("ngày trước minDate mờ đi, không bấm được", async () => {
    const tree = await mount(
      <DatePickerModal value="25-10-2026" minDate="20-10-2026" onChange={jest.fn()} />
    );
    await pressText(tree, "25/10/2026");

    expect(byLabel(tree, "Thứ Năm, 15/10/2026").props.disabled).toBe(true);
    expect(byLabel(tree, "Thứ Ba, 20/10/2026").props.disabled).toBe(false);
    // Cả tháng 9 nằm trước minDate: không lật về được.
    expect(byLabel(tree, "Trang trước").props.disabled).toBe(true);
  });

  it("giá trị đang trước minDate thì lịch mở ở minDate", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <DatePickerModal value="10-10-2026" minDate="20-10-2026" onChange={onChange} />
    );
    await pressText(tree, "10/10/2026");

    expect(texts(tree)).toContain("Thứ Ba, 20/10/2026");
    await pressText(tree, "Xác nhận");
    expect(onChange).toHaveBeenCalledWith("20-10-2026");
  });
});

describe("nút Xoá", () => {
  it("ô ngày không bắt buộc: Xoá trả về chuỗi rỗng", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <DatePickerModal clearable value="22-10-2026" onChange={onChange} />
    );
    await pressText(tree, "22/10/2026");
    await pressText(tree, "Xoá");

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("ô giờ không bắt buộc: Xoá trả về chuỗi rỗng", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <TimePickerModal clearable value="08:30" onChange={onChange} />
    );
    await pressText(tree, "08:30");
    await pressText(tree, "Xoá");

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("không có nút Xoá khi trường bắt buộc hoặc ô đang trống", async () => {
    const required = await mount(
      <DatePickerModal value="22-10-2026" onChange={jest.fn()} />
    );
    await pressText(required, "22/10/2026");
    expect(texts(required)).not.toContain("Xoá");

    const empty = await mount(<DatePickerModal clearable onChange={jest.fn()} />);
    await pressText(empty, "Chọn ngày");
    expect(texts(empty)).not.toContain("Xoá");
  });
});

describe("CalendarPanel chọn theo tháng", () => {
  it("bấm ô tháng là chọn luôn, không xuống lưới ngày", async () => {
    const onChange = jest.fn();
    const tree = await mount(
      <CalendarPanel value={makeDay(2026, 9, 1)} pickLevel="month" onChange={onChange} />
    );

    await pressText(tree, "Tháng 3");
    expect(onChange).toHaveBeenCalledWith(makeDay(2026, 2, 1));
    expect(texts(tree)).toContain("Năm 2026");
  });
});

const renderDateField = (
  name: string,
  formData: Record<string, any>,
  handleChange = jest.fn(),
  isRequired = true
) =>
  mount(
    <RenderInputByType
      f={{ id: 1, name, moTa: name, typeProperty: TypeProperty.Date, isRequired } as any}
      formData={formData}
      enumData={{}}
      referenceData={{}}
      handleChange={handleChange}
      pickImage={jest.fn()}
      setImages={jest.fn()}
      setLoadingImages={jest.fn()}
      styles={{}}
      mode="add"
      openEnumReferanceModal={jest.fn()}
    />
  );

describe("form động: cặp TuNgay – DenNgay", () => {
  it("Đến ngày không chọn được ngày trước Từ ngày", async () => {
    const tree = await renderDateField("DenNgay", {
      TuNgay: "20-10-2026",
      DenNgay: "25-10-2026",
    });
    await pressText(tree, "25/10/2026");

    expect(byLabel(tree, "Thứ Hai, 19/10/2026").props.disabled).toBe(true);
    expect(byLabel(tree, "Thứ Ba, 20/10/2026").props.disabled).toBe(false);
  });

  it("Từ ngày vượt quá Đến ngày thì Đến ngày dời theo", async () => {
    const handleChange = jest.fn();
    const tree = await renderDateField(
      "tuNgay",
      { tuNgay: "20-10-2026", denNgay: "25-10-2026" },
      handleChange
    );
    await pressText(tree, "20/10/2026");
    await press(byLabel(tree, "Thứ Tư, 28/10/2026"));
    await pressText(tree, "Xác nhận");

    expect(handleChange).toHaveBeenCalledWith("tuNgay", "28-10-2026");
    expect(handleChange).toHaveBeenCalledWith("denNgay", "28-10-2026");
  });

  it("Từ ngày vẫn trước Đến ngày thì không đụng Đến ngày", async () => {
    const handleChange = jest.fn();
    const tree = await renderDateField(
      "TuNgay",
      { TuNgay: "20-10-2026", DenNgay: "25-10-2026" },
      handleChange
    );
    await pressText(tree, "20/10/2026");
    await press(byLabel(tree, "Thứ Năm, 22/10/2026"));
    await pressText(tree, "Xác nhận");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("TuNgay", "22-10-2026");
  });

  it("trường ngày không bắt buộc có nút Xoá", async () => {
    const handleChange = jest.fn();
    const tree = await renderDateField(
      "NgayThanhLy",
      { NgayThanhLy: "22-10-2026" },
      handleChange,
      false
    );
    await pressText(tree, "22/10/2026");
    await pressText(tree, "Xoá");

    expect(handleChange).toHaveBeenCalledWith("NgayThanhLy", "");
  });
});

describe("lịch Điện mặt trời", () => {
  it("kỳ tuần: bấm một ngày là chọn 7 ngày tính tới ngày đó", async () => {
    const onConfirm = jest.fn();
    const tree = await mount(
      <SolarDateRangePicker
        visible
        period="Week"
        dateRange={{ fromDate: new Date(2026, 9, 16), toDate: new Date(2026, 9, 22) }}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(byLabel(tree, "Thứ Sáu, 23/10/2026").props.disabled).toBe(true);
    await press(byLabel(tree, "Thứ Hai, 19/10/2026"));
    expect(texts(tree)).toContain("13/10/2026 - 19/10/2026");

    await pressText(tree, "Xác nhận");
    const range = onConfirm.mock.calls[0][0];
    expect(range.fromDate.getDate()).toBe(13);
    expect(range.toDate.getDate()).toBe(19);
  });

  it("kỳ tháng: tháng chưa tới bị khoá", async () => {
    const tree = await mount(
      <SolarDateRangePicker
        visible
        period="Month"
        dateRange={{ fromDate: new Date(2026, 9, 1), toDate: new Date(2026, 9, 31) }}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    const november = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Tháng 11");
    let node: ReactTestRenderer.ReactTestInstance | null = november ?? null;
    while (node && typeof node.props.onPress !== "function") node = node.parent;
    expect(node?.props.disabled).toBe(true);
  });
});

describe("lịch Camera xem lại", () => {
  const renderSheet = (onVisibleMonthChange = jest.fn()) =>
    mount(
      <PlaybackDateSheet
        visible
        selectedDate={new Date(2026, 9, 22)}
        selectedStartTimeSec={null}
        today={new Date(2026, 9, 22)}
        recordingDays={[3, 15]}
        onVisibleMonthChange={onVisibleMonthChange}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );

  it("chấm ngày có bản ghi, khoá ngày tương lai", async () => {
    const tree = await renderSheet();

    expect(tree.root.findAll((node) => node.props.testID === "calendar-mark" && typeof node.type === "string")).toHaveLength(2);
    expect(byLabel(tree, "Thứ Sáu, 23/10/2026").props.disabled).toBe(true);
    expect(byLabel(tree, "Trang sau").props.disabled).toBe(true);
  });

  it("lật sang tháng trước thì nhờ nạp ngày có bản ghi của tháng đó", async () => {
    const onVisibleMonthChange = jest.fn();
    const tree = await renderSheet(onVisibleMonthChange);

    await press(byLabel(tree, "Trang trước"));
    expect(onVisibleMonthChange).toHaveBeenCalledTimes(1);
    expect(onVisibleMonthChange.mock.calls[0][0]).toEqual(new Date(2026, 8, 1));
  });

  it("Thời gian bắt đầu mở sheet giờ, Quay lại về lịch", async () => {
    const tree = await renderSheet();

    await press(byLabel(tree, "Chọn thời gian bắt đầu"));
    expect(texts(tree)).toContain("Quay lại");
    await pressText(tree, "Quay lại");
    expect(texts(tree)).toContain("Ngày có bản ghi");
  });
});
