import React from "react";
import { StyleSheet, Text } from "react-native";

/**
 * Cỡ chữ cuối cùng của một đoạn text = `fontSize` trong style
 *   × hệ số người dùng chọn trong Cài đặt › Cỡ chữ  (`TEXT_SCALE_STEPS`).
 *
 * Cỡ chữ cài trong điện thoại bị bỏ qua hoàn toàn, cả chiều to lẫn chiều nhỏ:
 * người dùng để cỡ lớn nhất của máy thì các màn dày số liệu vỡ bố cục, nên cỡ
 * chữ chỉ còn một nguồn duy nhất là thanh trượt trong app.
 */

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

/**
 * Bọc `Text` / `TextInput` để nhân `fontSize` theo hệ số người dùng chọn, và
 * luôn truyền `allowFontScaling={false}` xuống component gốc để cỡ chữ của điện
 * thoại không tác động — `maxFontSizeMultiplier` chỉ chặn chiều to, máy để cỡ
 * nhỏ thì chữ vẫn co lại.
 *
 * Phải ép bằng prop ở đây chứ không dùng `defaultProps`: từ React 19, JSX bỏ qua
 * `defaultProps` của function component, và `Text` của React Native là function
 * component.
 *
 * Hai trường hợp giữ nguyên cỡ chữ:
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
  const Scaled = (incomingProps: P) => {
    const factor = activeFactor;
    const props: P = { ...incomingProps, allowFontScaling: false };

    if (factor === 1 || incomingProps.allowFontScaling === false)
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
 * Dùng component này cho những chỗ cỡ chữ là một phần của hình học và
 * không được phép xê dịch. Luôn kèm `allowFontScaling={false}` — đây là `Text`
 * gốc, không đi qua lớp bọc nên không tự chặn cỡ chữ của điện thoại:
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
 * Trả về leading đã nhân hệ số cỡ chữ của app, nên gọi được trong `StyleSheet`
 * dựng lúc render: đổi cỡ chữ trong app sẽ remount cây điều hướng và dựng lại
 * style.
 */
export const scaledLineHeight = (fontSize: number, ratio: number) =>
  fontSize * activeFactor * ratio;

/**
 * Cỡ chữ cho chữ vẽ bên trong `<Svg>` (nhãn trục biểu đồ).
 *
 * `Text` của `react-native-svg` là component riêng, không đi qua lớp bọc mà
 * `installTextScaling` cài lên module `react-native`, nên phải nhân hệ số bằng
 * tay.
 *
 * Chỗ gọi phải tự nới lề trục theo `getTextScaleFactor()` cho nhãn có chỗ đứng —
 * xem `SolarPlantScreen.visuals` và `HomeMachineGrowthCard`.
 */
export const scaledSvgFontSize = (fontSize: number) => fontSize * activeFactor;
