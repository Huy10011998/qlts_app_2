import React from "react";
import { TouchableOpacity, Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { RenderInputByType } from "../src/components/form/RenderInputByType";
import { getParentGate } from "../src/utils/cascade/parentGate";
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

const referenceField = {
  id: 1,
  name: "ID_Room",
  moTa: "Phòng",
  typeProperty: TypeProperty.Reference,
  referenceName: "Room",
  parentsFields: "ID_Complex,ID_Building",
} as any;

const enumField = {
  id: 2,
  name: "TypeNhienLieu",
  moTa: "Loại nhiên liệu",
  typeProperty: TypeProperty.Enum,
  enumName: "TypeLoaiNhienLieu",
  // Metadata production có field Enum mang parentsFields rác — không được vì
  // thế mà khoá ô Enum (Enum lấy danh sách bằng get-category-enum).
  parentsFields: "ID_Complex,ID_Building",
} as any;

const mount = async (
  field: any,
  formData: Record<string, any>,
  openEnumReferanceModal = jest.fn(),
) => {
  const parentGate =
    field.typeProperty === TypeProperty.Reference
      ? getParentGate(field, formData)
      : null;

  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <RenderInputByType
          f={field}
          formData={formData}
          enumData={{}}
          referenceData={{}}
          handleChange={jest.fn()}
          pickImage={jest.fn()}
          setImages={jest.fn()}
          setLoadingImages={jest.fn()}
          styles={{}}
          mode="add"
          openEnumReferanceModal={openEnumReferanceModal}
          parentGate={parentGate}
        />
      </ThemeProvider>,
    );
  });

  mounted.push(tree!);

  const trigger = tree!.root.findAllByType(TouchableOpacity)[0];
  const texts = tree!.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => typeof child === "string") as string[];

  return { trigger, texts, openEnumReferanceModal };
};

describe("ô chọn Reference khi thiếu cấp cha", () => {
  it("thiếu cấp cha thì khoá ô và nhắc chọn cấp trên", async () => {
    const { trigger, texts } = await mount(referenceField, {
      ID_Complex: 3,
      // thiếu ID_Building
    });

    expect(trigger.props.disabled).toBe(true);
    expect(trigger.props.accessibilityState).toEqual({ disabled: true });
    expect(texts.some((text) => text.includes("ID_Building"))).toBe(true);
  });

  it("đủ cấp cha thì bấm được và mở danh sách", async () => {
    const onOpen = jest.fn();
    const { trigger } = await mount(
      referenceField,
      { ID_Complex: 3, ID_Building: 14 },
      onOpen,
    );

    expect(trigger.props.disabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      trigger.props.onPress();
    });

    expect(onOpen).toHaveBeenCalledWith(referenceField);
  });

  /* Màn Sửa: cấp cha chưa nạp xong nhưng ô đã có giá trị. Che giá trị bằng câu
     nhắc là người dùng tưởng đã mất dữ liệu. Nhãn lấy từ `<field>_MoTa` nên
     không phụ thuộc danh sách. */
  it("bị khoá mà đã có giá trị thì vẫn hiện giá trị", async () => {
    const { trigger, texts } = await mount(referenceField, {
      ID_Room: 8,
      ID_Room_MoTa: "R008 PHÒNG HỌP",
    });

    expect(trigger.props.disabled).toBe(true);
    expect(texts).toContain("R008 PHÒNG HỌP");
  });

  it("field không khai cấp cha thì không bị khoá", async () => {
    const { trigger } = await mount(
      { ...referenceField, parentsFields: undefined },
      {},
    );

    expect(trigger.props.disabled).toBe(false);
  });
});

describe("ô khoá theo ngữ cảnh (isLocked)", () => {
  it("field prefill bị khoá nhưng vẫn hiện placeholder khi chưa có giá trị", async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <RenderInputByType
            f={{ ...referenceField, parentsFields: undefined }}
            formData={{}}
            enumData={{}}
            referenceData={{}}
            handleChange={jest.fn()}
            pickImage={jest.fn()}
            setImages={jest.fn()}
            setLoadingImages={jest.fn()}
            styles={{}}
            mode="add"
            openEnumReferanceModal={jest.fn()}
            isLocked
          />
        </ThemeProvider>,
      );
    });

    mounted.push(tree!);

    const trigger = tree!.root.findAllByType(TouchableOpacity)[0];
    const texts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .filter((child) => typeof child === "string") as string[];

    expect(trigger.props.disabled).toBe(true);
    // Không có câu nhắc cấp cha thì không được để ô trắng trơn.
    expect(texts).toContain("Chọn Phòng");
  });
});

describe("ô chọn Enum", () => {
  it("KHÔNG bị khoá dù metadata khai parentsFields rác", async () => {
    const onOpen = jest.fn();
    const { trigger } = await mount(enumField, {}, onOpen);

    expect(trigger.props.disabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      trigger.props.onPress();
    });

    expect(onOpen).toHaveBeenCalledWith(enumField);
  });
});
