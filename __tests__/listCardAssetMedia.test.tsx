import React from "react";
import { Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "../src/context/ThemeContext";
import ListCardAsset from "../src/components/list/ListCardAsset";
import ImagePreviewModal from "../src/components/ui/ImagePreviewModal";
import { getPreviewAttachProperty } from "../src/services/data/callApi";
import { fetchImage } from "../src/utils/Image";
import { TypeProperty } from "../src/utils/Enum";
import type { Field } from "../src/types";

jest.mock("../src/utils/Image", () => ({
  ...jest.requireActual("../src/utils/Image"),
  fetchImage: jest.fn(),
}));

jest.mock("../src/services/data/callApi", () => ({
  ...jest.requireActual("../src/services/data/callApi"),
  getPreviewAttachProperty: jest.fn(),
}));

const mockFetchImage = fetchImage as jest.MockedFunction<typeof fetchImage>;
const mockGetOriginal = getPreviewAttachProperty as jest.MockedFunction<
  typeof getPreviewAttachProperty
>;

const field = (name: string, moTa: string, typeProperty: number) =>
  ({ name, moTa, typeProperty, isReadOnly: false }) as Field;

const FIELDS = [
  field("ma", "Mã", TypeProperty.String),
  field("zalo", "Zalo", TypeProperty.String),
  field("hinhAnh1", "Hình ảnh 1", TypeProperty.Image),
  field("anhBase64", "Ảnh base64", TypeProperty.ImageBase64),
];

const PNG = "data:image/png;base64,iVBORw0KGgo=";

const mount = async (item: Record<string, any>) => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    // Ô base64 có sẵn ImagePreviewModal, cần safe area.
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>
          <ListCardAsset item={item} fields={FIELDS} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  return tree!;
};

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter((child) => typeof child === "string");

const hasAvatar = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll((node) => node.props.name === "document-text-outline")
    .length > 0;

describe("cột ảnh của ListCardAsset", () => {
  beforeEach(() => {
    mockFetchImage.mockReset();
    mockGetOriginal.mockReset();
  });

  it("không có ảnh thì ẩn ô ảnh, ẩn dòng trống và hiện lại icon", async () => {
    const tree = await mount({ id: 1, ma: "BL-0079", zalo: null });

    expect(texts(tree)).toContain("Mã");
    expect(texts(tree)).not.toContain("Zalo");
    expect(texts(tree)).not.toContain("Hình ảnh 1");
    expect(texts(tree)).not.toContain("Ảnh base64");
    expect(hasAvatar(tree)).toBe(true);
    expect(mockFetchImage).not.toHaveBeenCalled();
  });

  it("có ảnh thì hiện ô ảnh và bỏ icon", async () => {
    mockFetchImage.mockImplementation(async (name, _path, setLoading, setImages) => {
      setLoading((prev) => ({ ...prev, [name]: true }));
      setImages((prev) => ({ ...prev, [name]: PNG }));
      setLoading((prev) => ({ ...prev, [name]: false }));
    });

    const tree = await mount({
      id: 2,
      ma: "BL-0080",
      hinhAnh1: "Property\\abc.jpg",
      anhBase64: PNG,
    });

    expect(texts(tree)).toContain("Hình ảnh 1");
    expect(texts(tree)).toContain("Ảnh base64");
    expect(hasAvatar(tree)).toBe(false);
    expect(mockFetchImage).toHaveBeenCalledTimes(1);
  });

  it("bấm ảnh thì xem to: mở bằng bản thu nhỏ rồi thay bằng ảnh gốc", async () => {
    mockFetchImage.mockImplementation(async (name, _path, setLoading, setImages) => {
      setImages((prev) => ({ ...prev, [name]: PNG }));
      setLoading((prev) => ({ ...prev, [name]: false }));
    });
    let resolveOriginal!: (res: { headers: any; data: string }) => void;
    mockGetOriginal.mockReturnValue(
      new Promise((resolve) => {
        resolveOriginal = resolve;
      }),
    );

    const tree = await mount({ id: 4, ma: "DL-BL-0486", hinhAnh1: "Property\\uv.jpg" });
    const preview = () => tree.root.findByType(ImagePreviewModal).props.uri;

    expect(preview()).toBeNull();

    await ReactTestRenderer.act(async () => {
      tree.root
        .findAll(
          (node) =>
            node.props.accessibilityLabel === "Xem Hình ảnh 1" &&
            typeof node.props.onPress === "function",
        )[0]
        .props.onPress();
    });

    // Ảnh gốc lấy theo đường dẫn gốc, không phải bản `_Resize`.
    expect(mockGetOriginal).toHaveBeenCalledWith("Property\\uv.jpg");
    expect(preview()).toBe(PNG);

    await ReactTestRenderer.act(async () => {
      resolveOriginal({ headers: {}, data: "R09PRA==" });
    });

    expect(preview()).toBe("data:image/jpeg;base64,R09PRA==");
  });

  // Có đường dẫn nhưng tệp trên máy chủ hỏng/mất: ẩn ô, không gọi lại API.
  it("tải ảnh lỗi thì ẩn ô và không gọi lại", async () => {
    mockFetchImage.mockImplementation(async (name, _path, setLoading) => {
      setLoading((prev) => ({ ...prev, [name]: true }));
      setLoading((prev) => ({ ...prev, [name]: false }));
    });

    const tree = await mount({ id: 3, ma: "BL-0081", hinhAnh1: "Property\\x.jpg" });

    expect(texts(tree)).not.toContain("Hình ảnh 1");
    expect(hasAvatar(tree)).toBe(true);
    expect(mockFetchImage).toHaveBeenCalledTimes(1);
  });
});
