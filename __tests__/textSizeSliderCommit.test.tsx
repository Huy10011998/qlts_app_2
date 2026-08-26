import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { View } from "react-native";

import TextSizeSlider from "../src/components/ui/TextSizeSlider";

jest.mock("react-native-haptic-feedback", () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));

// Thanh trượt chỉ cần bảng màu; dựng cả ThemeProvider thì phải chờ AsyncStorage.
jest.mock("../src/utils/helpers/colors", () => {
  const actual = jest.requireActual("../src/utils/helpers/colors");

  return { ...actual, useAppColors: () => actual.APP_COLORS.light };
});

const STEP_COUNT = 7;
const TRACK_WIDTH = 270;

/**
 * Bọc thanh trượt đúng như màn Cỡ chữ dùng: `value` là nấc xem trước, đổi theo
 * `onChange`. Không giữ lại `value` thì cú kéo thứ hai đọc sai nấc hiện tại.
 */
const Harness = ({
  onChange,
  onChangeEnd,
}: {
  onChange: (step: number) => void;
  onChangeEnd: (step: number) => void;
}) => {
  const [step, setStep] = React.useState(2);

  return (
    <TextSizeSlider
      stepCount={STEP_COUNT}
      value={step}
      onChange={(next) => {
        setStep(next);
        onChange(next);
      }}
      onChangeEnd={onChangeEnd}
    />
  );
};

/**
 * Sự kiện chạm đủ hình dạng cho `PanResponder`.
 *
 * `PanResponder` không đọc `nativeEvent` mà tính centroid từ `touchHistory`, nên
 * thiếu `touchBank` là nó nổ trước khi handler của thanh trượt chạy.
 */
let touchClock = 0;

const makeTouchEvent = (x: number) => {
  // Mốc thời gian phải tăng dần: `PanResponder` bỏ qua cú move nào có
  // `mostRecentTimeStamp` trùng lần trước, nên để cố định là mất nấc.
  touchClock += 16;

  return {
    nativeEvent: { locationX: x, pageX: x, pageY: 0, identifier: 0 },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: touchClock,
      touchBank: [
        {
          touchActive: true,
          startPageX: x,
          startPageY: 0,
          startTimeStamp: touchClock,
          currentPageX: x,
          currentPageY: 0,
          currentTimeStamp: touchClock,
          previousPageX: x,
          previousPageY: 0,
          previousTimeStamp: touchClock,
        },
      ],
    },
  };
};

const renderSlider = (
  onChange: (step: number) => void,
  onChangeEnd: (step: number) => void,
) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Harness onChange={onChange} onChangeEnd={onChangeEnd} />,
    );
  });

  const root = tree.root.findAllByType(View)[0];

  // PanResponder chỉ tính được nấc sau khi đo xong bề ngang.
  ReactTestRenderer.act(() => {
    root.props.onLayout({ nativeEvent: { layout: { width: TRACK_WIDTH } } });
  });

  const touchAt = (x: number, handler: string) =>
    ReactTestRenderer.act(() => {
      root.props[handler](makeTouchEvent(x));
    });

  return { touchAt, tree };
};

describe("thanh trượt cỡ chữ: rê thì xem trước, nhấc tay mới áp dụng", () => {
  it("kéo qua nhiều nấc chỉ gọi onChange, không gọi onChangeEnd", () => {
    const onChange = jest.fn();
    const onChangeEnd = jest.fn();
    const { touchAt } = renderSlider(onChange, onChangeEnd);

    touchAt(0, "onResponderGrant");
    touchAt(TRACK_WIDTH / 2, "onResponderMove");
    touchAt(TRACK_WIDTH, "onResponderMove");

    // Đây là điều kiện sống của cú kéo: áp dụng thật remount cả cây điều hướng,
    // gọi giữa lúc ngón tay còn trên thanh là thanh trượt bị huỷ.
    expect(onChangeEnd).not.toHaveBeenCalled();
    expect(onChange.mock.calls.map(([step]) => step)).toEqual([
      0,
      (STEP_COUNT - 1) / 2,
      STEP_COUNT - 1,
    ]);
  });

  it("nhấc tay áp dụng đúng nấc cuối cùng đã rê tới", () => {
    const onChange = jest.fn();
    const onChangeEnd = jest.fn();
    const { touchAt } = renderSlider(onChange, onChangeEnd);

    touchAt(0, "onResponderGrant");
    touchAt(TRACK_WIDTH, "onResponderMove");
    touchAt(TRACK_WIDTH, "onResponderRelease");

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(STEP_COUNT - 1);
  });

  it("cử chỉ bị hệ thống cắt ngang vẫn chốt nấc đang xem trước", () => {
    const onChange = jest.fn();
    const onChangeEnd = jest.fn();
    const { touchAt } = renderSlider(onChange, onChangeEnd);

    touchAt(TRACK_WIDTH / 2, "onResponderGrant");
    touchAt(TRACK_WIDTH / 2, "onResponderTerminate");

    expect(onChangeEnd).toHaveBeenCalledWith((STEP_COUNT - 1) / 2);
  });

  it("chạm một điểm rồi nhấc ra: một lần xem trước, một lần áp dụng", () => {
    const onChange = jest.fn();
    const onChangeEnd = jest.fn();
    const { touchAt } = renderSlider(onChange, onChangeEnd);

    touchAt(0, "onResponderGrant");
    touchAt(0, "onResponderRelease");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(0);
  });
});
