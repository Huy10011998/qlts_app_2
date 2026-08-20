import React from "react";
import { PixelRatio, StyleSheet, Text, TextInput } from "react-native";

/**
 * Cỡ chữ cuối cùng của một đoạn text = `fontSize` trong style
 *   × hệ số người dùng chọn trong Cài đặt › Cỡ chữ  (`TEXT_SCALE_STEPS`)
 *   × cỡ chữ của thiết bị, kẹp trần ở `READABLE_TEXT_MAX_SCALE`.
 *
 * Hai tầng tách bạch có chủ ý: tầng thiết bị là thứ React Native tự lo và app
 * chỉ kẹp trần cho khỏi vỡ layout; tầng người dùng là thanh trượt trong app,
 * luôn có tác dụng kể cả trên máy để cỡ chữ mặc định.
 */

/** Trần cho phần phóng to đến từ cài đặt của thiết bị. */
export const READABLE_TEXT_MAX_SCALE = 1.3;

/**
 * Trần thấp hơn cho những chỗ chật (chip, banner, ô nhập trong sheet).
 *
 * Chỉ hạ phần thiết bị — hệ số người dùng chọn vẫn áp dụng đầy đủ, vì nó nhân
 * thẳng vào `fontSize` chứ không đi qua `maxFontSizeMultiplier`.
 */
export const COMPACT_TEXT_MAX_SCALE = 1.15;

/**
 * Bảy nấc của thanh trượt cỡ chữ, xếp theo thứ tự trái sang phải.
 *
 * `TEXT_SCALE_DEFAULT_STEP` là nấc mặc định (hệ số 1) — người chưa từng chỉnh
 * gì thấy đúng cỡ chữ như trước khi có tính năng này.
 */
export const TEXT_SCALE_STEPS = [0.85, 0.92, 1, 1.1, 1.22, 1.36, 1.5] as const;
export const TEXT_SCALE_DEFAULT_STEP = 2;

export const clampTextScaleStep = (step: number) =>
  Math.min(Math.max(Math.round(step), 0), TEXT_SCALE_STEPS.length - 1);

export const getTextScaleFactorForStep = (step: number) =>
  TEXT_SCALE_STEPS[clampTextScaleStep(step)];

let activeFactor: number = TEXT_SCALE_STEPS[TEXT_SCALE_DEFAULT_STEP];

/** Hệ số cỡ chữ đang áp dụng, cho code không đứng trong cây React đọc. */
export const getTextScaleFactor = () => activeFactor;

/**
 * Đổi hệ số cỡ chữ.
 *
 * Chỉ ghi biến module — các `Text` đang mount không tự vẽ lại. Người gọi phải
 * remount cây điều hướng; `FontScaleProvider` + key trên `RootNavigator` lo
 * việc đó.
 */
export const setTextScaleFactor = (factor: number) => {
  activeFactor = factor;
};

type ScalableTextComponent = {
  defaultProps?: Record<string, unknown>;
};

/**
 * Đặt trần phóng to theo thiết bị cho mọi `Text`/`TextInput` không khai báo
 * riêng. Trần này là hằng số, không đổi theo lựa chọn của người dùng.
 */
export function configureTextScalingDefaults(
  textComponent: ScalableTextComponent = Text as ScalableTextComponent,
  textInputComponent: ScalableTextComponent = TextInput as ScalableTextComponent
) {
  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    maxFontSizeMultiplier:
      textComponent.defaultProps?.maxFontSizeMultiplier ??
      READABLE_TEXT_MAX_SCALE,
  };

  textInputComponent.defaultProps = {
    ...textInputComponent.defaultProps,
    maxFontSizeMultiplier:
      textInputComponent.defaultProps?.maxFontSizeMultiplier ??
      READABLE_TEXT_MAX_SCALE,
  };
}

/**
 * Bọc `Text` / `TextInput` để nhân `fontSize` theo hệ số người dùng chọn.
 *
 * Hai trường hợp được để nguyên:
 *
 * 1. `allowFontScaling={false}` — prop này nghĩa là "chữ này không co giãn",
 *    nên nó phải chặn cả hệ số của app chứ không riêng cỡ chữ thiết bị. Nhờ vậy
 *    `react-native-vector-icons` cũng nằm ngoài: icon thực chất là một `Text`
 *    font icon với `fontSize: size`, và thư viện đặt sẵn `allowFontScaling:
 *    false`. Icon trong ứng dụng này nằm trong khung cỡ cố định (ô tròn 38px,
 *    thanh tab, nút quét nhô lên trên nền SVG) nên phóng to là vỡ.
 * 2. Style không khai báo `fontSize` tường minh. Đây là điểm mấu chốt cho `Text`
 *    lồng nhau: chữ con không tự khai cỡ thì kế thừa cỡ *đã nhân* của chữ cha,
 *    thay vì bị ép về cỡ mặc định.
 *
 * Hệ số 1 thì trả thẳng component gốc, không tốn một phép tính nào.
 */
const withTextScale = <P extends { style?: unknown; allowFontScaling?: boolean }>(
  Base: React.ComponentType<P>,
  displayName: string
) => {
  const Scaled = (props: P) => {
    const factor = activeFactor;

    if (factor === 1 || props.allowFontScaling === false)
      return React.createElement(Base, props);

    const flattened = StyleSheet.flatten(props.style as never) as
      | { fontSize?: unknown }
      | undefined;
    const fontSize = flattened?.fontSize;

    if (typeof fontSize !== "number") return React.createElement(Base, props);

    return React.createElement(Base, {
      ...props,
      style: [props.style, { fontSize: fontSize * factor }],
    } as P);
  };

  Scaled.displayName = displayName;

  return Scaled;
};

/**
 * `Text` không đi theo cỡ chữ người dùng chọn.
 *
 * `allowFontScaling={false}` chỉ chặn tầng thiết bị, không chặn hệ số nhân của
 * app — dùng component này cho những chỗ cỡ chữ là một phần của hình học và
 * không được phép xê dịch:
 *
 * - chữ nung vào ảnh chụp (cỡ tính từ kích thước ảnh, không liên quan tới UI);
 * - nhãn thanh tab (khớp `TAB_HEIGHT` và SVG nền);
 * - số trong bong bóng tròn cỡ cố định, nhãn thước giờ, badge chồng lên video.
 *
 * Được gán trong `installTextScaling`; trước lúc đó nó là `Text` thường, vốn
 * cũng chính là component gốc chưa bọc.
 */
export let UnscaledText: React.ComponentType<
  React.ComponentProps<typeof Text>
> = Text;

let isInstalled = false;

/**
 * Cài cơ chế nhân cỡ chữ vào chính module `react-native`.
 *
 * Ghi đè `Text` / `TextInput` trên object module thay vì sửa 94 file: mọi nơi
 * `import { Text } from "react-native"` đều đọc thuộc tính này lúc render nên
 * ăn ngay, kể cả module đã được import trước lúc cài. Nội bộ React Native lấy
 * `Text` qua đường dẫn tương đối chứ không qua object này, nên không có đệ quy.
 *
 * Gọi một lần ở `index.js`, trước khi đăng ký component gốc.
 */
export function installTextScaling() {
  if (isInstalled) return;
  isInstalled = true;

  const ReactNative = require("react-native");

  // Giữ lại component gốc *trước* khi ghi đè, đó là lối thoát cho những chỗ
  // không được phóng to.
  const BaseText = ReactNative.Text;
  const BaseTextInput = ReactNative.TextInput;

  UnscaledText = BaseText;

  // Trần thiết bị đặt trên component *gốc*, không phải bản bọc: bản bọc chỉ
  // truyền props xuống nên React vẫn điền defaultProps của gốc như thường.
  configureTextScalingDefaults(BaseText, BaseTextInput);

  const ScaledText = withTextScale(BaseText, "Text");
  const ScaledTextInput = withTextScale(BaseTextInput, "TextInput");

  Object.defineProperty(ReactNative, "Text", {
    configurable: true,
    get: () => ScaledText,
  });
  Object.defineProperty(ReactNative, "TextInput", {
    configurable: true,
    get: () => ScaledTextInput,
  });
}

/**
 * `lineHeight` trong StyleSheet là px cứng và React Native **không** scale nó
 * theo cỡ chữ, nên chữ to ra mà dòng không giãn sẽ xén dấu tiếng Việt.
 *
 * Đa số trường hợp nên **bỏ hẳn** `lineHeight` để platform tự tính. Chỉ dùng
 * helper này khi leading rộng là chủ ý — đoạn văn dài trong Hướng dẫn sử dụng
 * chẳng hạn — vì để platform tự tính sẽ cho leading chặt hơn hẳn.
 *
 * Trả về leading đã tính cả hai tầng scale, nên gọi được trong `StyleSheet`
 * dựng lúc render: đổi cỡ chữ trong app sẽ remount cây điều hướng và dựng lại
 * style, còn đổi cỡ chữ ở Cài đặt hệ thống thì Activity/app khởi động lại.
 */
export const scaledLineHeight = (
  fontSize: number,
  ratio: number,
  deviceCap: number = READABLE_TEXT_MAX_SCALE
) =>
  fontSize *
  activeFactor *
  Math.min(PixelRatio.getFontScale(), deviceCap) *
  ratio;
