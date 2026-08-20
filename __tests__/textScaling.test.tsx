import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { PixelRatio, StyleSheet } from "react-native";
import {
  clampTextScaleStep,
  configureTextScalingDefaults,
  getTextScaleFactor,
  getTextScaleFactorForStep,
  installTextScaling,
  READABLE_TEXT_MAX_SCALE,
  scaledLineHeight,
  setTextScaleFactor,
  TEXT_SCALE_DEFAULT_STEP,
  TEXT_SCALE_STEPS,
  UnscaledText,
} from "../src/utils/helpers/textScaling";

// `installTextScaling` ghi đè Text/TextInput trên chính module react-native, nên
// phải lấy chúng ra *sau* lời gọi này — đúng như thứ tự thật ở index.js.
installTextScaling();

const { Text, TextInput } = require("react-native");
const Ionicons = require("react-native-vector-icons/Ionicons").default;

const sheet = StyleSheet.create({
  sized: { fontSize: 20 },
  unsized: { color: "red" },
});

const render = async (element: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });

  return tree;
};

const fontSizeOf = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) as { fontSize?: number })
    ?.fontSize;

afterEach(() => {
  setTextScaleFactor(getTextScaleFactorForStep(TEXT_SCALE_DEFAULT_STEP));
});

describe("nấc cỡ chữ", () => {
  it("nấc mặc định là hệ số 1, để người chưa chỉnh gì thấy y như cũ", () => {
    expect(TEXT_SCALE_STEPS[TEXT_SCALE_DEFAULT_STEP]).toBe(1);
  });

  it("tăng dần từ trái sang phải", () => {
    const sorted = [...TEXT_SCALE_STEPS].sort((a, b) => a - b);

    expect([...TEXT_SCALE_STEPS]).toEqual(sorted);
    expect(new Set(TEXT_SCALE_STEPS).size).toBe(TEXT_SCALE_STEPS.length);
  });

  it("kẹp nấc ngoài biên và làm tròn giá trị lẻ", () => {
    expect(clampTextScaleStep(-3)).toBe(0);
    expect(clampTextScaleStep(99)).toBe(TEXT_SCALE_STEPS.length - 1);
    expect(clampTextScaleStep(2.4)).toBe(2);
  });
});

describe("nhân cỡ chữ toàn cục", () => {
  it("nhân fontSize khai báo tường minh", async () => {
    setTextScaleFactor(1.5);

    const tree = await render(<Text style={sheet.sized}>xin chào</Text>);

    expect(fontSizeOf(tree.toJSON() as never)).toBe(30);
  });

  it("để nguyên Text con không tự khai cỡ, cho nó kế thừa cỡ đã nhân của cha", async () => {
    setTextScaleFactor(1.5);

    const tree = await render(
      <Text style={sheet.sized}>
        cha
        <Text style={sheet.unsized}>con</Text>
      </Text>
    );

    const json = tree.toJSON() as unknown as {
      props: { style?: unknown };
      children: { props: { style?: unknown } }[];
    };

    expect(fontSizeOf(json)).toBe(30);
    // Nếu chỗ này thành một con số thì Text lồng nhau đã hỏng: chữ con bị ép về
    // cỡ riêng thay vì lớn lên theo cha.
    expect(fontSizeOf(json.children[1])).toBeUndefined();
  });

  it("không đụng vào style khi hệ số bằng 1", async () => {
    setTextScaleFactor(1);

    const tree = await render(<Text style={sheet.sized}>xin chào</Text>);

    expect((tree.toJSON() as never as { props: { style: unknown } }).props.style)
      .toBe(sheet.sized);
  });

  it("áp dụng cho cả TextInput", async () => {
    setTextScaleFactor(1.5);

    const tree = await render(<TextInput style={sheet.sized} value="x" />);

    expect(fontSizeOf(tree.toJSON() as never)).toBe(30);
  });

  it("giữ được ref của TextInput", async () => {
    setTextScaleFactor(1.5);

    const ref = React.createRef<unknown>();
    await render(<TextInput ref={ref} style={sheet.sized} value="x" />);

    expect(ref.current).not.toBeNull();
  });

  it("allowFontScaling={false} chặn cả hệ số của app, không riêng cỡ chữ máy", async () => {
    setTextScaleFactor(1.5);

    const tree = await render(
      <Text allowFontScaling={false} style={sheet.sized}>
        xin chào
      </Text>
    );

    expect(fontSizeOf(tree.toJSON() as never)).toBe(20);
  });

  it("không phóng to icon của react-native-vector-icons", async () => {
    setTextScaleFactor(1.5);

    // Icon thực chất là một Text font icon với `fontSize: size`. Chúng nằm trong
    // khung cỡ cố định (ô tròn 38px, thanh tab, nút quét trên nền SVG) nên phóng
    // to là vỡ. Thư viện đặt sẵn `allowFontScaling: false`, quy tắc ở trên lo nốt.
    const tree = await render(<Ionicons name="qr-code-outline" size={24} />);
    const flat = StyleSheet.flatten(
      (tree.toJSON() as never as { props: { style: unknown } }).props.style
    ) as { fontSize?: number };

    expect(flat.fontSize).toBe(24);
  });

  it("UnscaledText không bị nhân — lối thoát cho chỗ hình học khoá cứng", async () => {
    setTextScaleFactor(1.5);

    // Watermark nung vào ảnh chụp và nhãn thanh tab đi qua đây. Nếu chỗ này
    // thành 30 thì ảnh xuất ra sẽ đổi theo cỡ chữ người dùng chọn.
    const tree = await render(
      <UnscaledText style={sheet.sized}>xin chào</UnscaledText>
    );

    expect(fontSizeOf(tree.toJSON() as never)).toBe(20);
  });

  it("công bố hệ số đang áp dụng cho code ngoài cây React", () => {
    setTextScaleFactor(1.22);

    expect(getTextScaleFactor()).toBe(1.22);
  });
});

describe("trần phóng to theo thiết bị", () => {
  it("đặt trần mặc định cho cả Text và TextInput", () => {
    configureTextScalingDefaults();

    const readDefault = (component: unknown) =>
      (component as { defaultProps?: Record<string, unknown> }).defaultProps
        ?.maxFontSizeMultiplier;

    expect(readDefault(Text)).toBe(READABLE_TEXT_MAX_SCALE);
    expect(readDefault(TextInput)).toBe(READABLE_TEXT_MAX_SCALE);
  });

  it("tới được props render thật, không chỉ nằm trên object component", async () => {
    const tree = await render(<Text>xin chào</Text>);

    expect(
      (tree.toJSON() as never as { props: { maxFontSizeMultiplier?: number } })
        .props.maxFontSizeMultiplier
    ).toBe(READABLE_TEXT_MAX_SCALE);
  });
});

describe("scaledLineHeight", () => {
  const deviceFontScale = PixelRatio.getFontScale();

  it("giãn dòng theo cả hệ số người dùng lẫn cỡ chữ của máy", () => {
    setTextScaleFactor(1.22);
    const generousCap = deviceFontScale + 1;

    expect(scaledLineHeight(13.5, 1.55, generousCap)).toBeCloseTo(
      13.5 * 1.22 * deviceFontScale * 1.55
    );
  });

  it("không để phần thiết bị vượt trần", () => {
    setTextScaleFactor(1);
    const tightCap = deviceFontScale / 2;

    expect(scaledLineHeight(13.5, 1.55, tightCap)).toBeCloseTo(
      13.5 * tightCap * 1.55
    );
  });
});
