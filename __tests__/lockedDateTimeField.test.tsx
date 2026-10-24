import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { RenderInputByType } from "../src/components/form/RenderInputByType";
import { DatePickerModal } from "../src/components/modal/Date/DatePickerModal";
import { TimePickerModal } from "../src/components/modal/Time/TimePickerModal";
import { TypeProperty } from "../src/utils/Enum";

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

let mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted.forEach((tree) => tree.unmount());
  });
  mounted = [];
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

const sheetTitles = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => child === "Chọn ngày" || child === "Chọn giờ");

const renderField = (typeProperty: TypeProperty, value: string, isLocked: boolean) =>
  mount(
    <RenderInputByType
      f={{ id: 1, name: "NgayMua", moTa: "Ngày mua", typeProperty } as any}
      formData={{ NgayMua: value }}
      enumData={{}}
      referenceData={{}}
      handleChange={jest.fn()}
      pickImage={jest.fn()}
      setImages={jest.fn()}
      setLoadingImages={jest.fn()}
      styles={{}}
      mode="edit"
      openEnumReferanceModal={jest.fn()}
      isLocked={isLocked}
    />
  );

describe("trường Ngày / Giờ bị khoá trong form động", () => {
  it.each([
    ["Ngày", TypeProperty.Date, "22-10-2026", "22/10/2026"],
    ["Giờ", TypeProperty.Time, "08:30", "08:30"],
  ])("%s khoá: vẫn hiện giá trị nhưng không bấm được", async (_, type, value, shown) => {
    const tree = await renderField(type, value, true);
    const trigger = tree.root.findAllByType(TouchableOpacity)[0];

    expect(trigger.props.disabled).toBe(true);
    expect(
      tree.root.findAllByType(Text).some((node) => node.props.children === shown)
    ).toBe(true);
  });

  it.each([
    ["Ngày", TypeProperty.Date, "22-10-2026"],
    ["Giờ", TypeProperty.Time, "08:30"],
  ])("%s không khoá thì bấm được như cũ", async (_, type, value) => {
    const tree = await renderField(type, value, false);
    const trigger = tree.root.findAllByType(TouchableOpacity)[0];

    expect(trigger.props.disabled).toBe(false);
  });
});

describe("bộ chọn ngày / giờ bị khoá", () => {
  it.each([
    ["ngày", <DatePickerModal disabled value="22-10-2026" onChange={jest.fn()} />],
    ["giờ", <TimePickerModal disabled value="08:30" onChange={jest.fn()} />],
  ])("ô %s khoá thì không mở sheet", async (_, element) => {
    const tree = await mount(element);
    const trigger = tree.root.findAllByType(TouchableOpacity)[0];

    expect(trigger.props.disabled).toBe(true);
    expect(sheetTitles(tree)).toEqual([]);
  });
});
