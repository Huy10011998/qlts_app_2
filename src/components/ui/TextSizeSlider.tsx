import React, { useCallback, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useAppColors } from "../../utils/helpers/colors";

const TRACK_HEIGHT = 4;
const THUMB_WIDTH = 30;
const THUMB_HEIGHT = 30;
const TICK_SIZE = 3;

/**
 * Bề ngang tâm thumb chạy được: trừ đi đúng một thumb, vì tâm nó không ra khỏi
 * hai mép. Dùng chung cho cả việc đọc điểm chạm lẫn việc đặt thumb, nên hai
 * chiều luôn khớp nhau.
 */
export const usableTrackWidth = (trackWidth: number) =>
  Math.max(trackWidth - THUMB_WIDTH, 0);

/** Quy điểm chạm theo trục ngang về nấc gần nhất. */
export const stepFromTouch = (
  x: number,
  trackWidth: number,
  stepCount: number
) => {
  const usable = Math.max(usableTrackWidth(trackWidth), 1);
  const ratio = (x - THUMB_WIDTH / 2) / usable;

  return Math.round(Math.min(Math.max(ratio, 0), 1) * (stepCount - 1));
};

/** Vị trí mép trái của thumb cho một nấc. */
export const offsetForStep = (
  step: number,
  trackWidth: number,
  stepCount: number
) => (step / Math.max(stepCount - 1, 1)) * usableTrackWidth(trackWidth);

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

const stepHaptic = () => {
  try {
    ReactNativeHapticFeedback.trigger("selection", HAPTIC_OPTIONS);
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};

type TextSizeSliderProps = {
  stepCount: number;
  value: number;
  onChange: (step: number) => void;
  accessibilityLabel?: string;
};

/**
 * Thanh trượt rời rạc kiểu màn "Cỡ chữ" của iOS: kéo hoặc chạm để nhảy nấc.
 *
 * Tự vẽ thay vì thêm thư viện slider, vì chỉ cần vài nấc cố định và tránh kéo
 * thêm một native module vào dự án.
 */
export default function TextSizeSlider({
  stepCount,
  value,
  onChange,
  accessibilityLabel,
}: TextSizeSliderProps) {
  const colors = useAppColors();
  const [trackWidth, setTrackWidth] = useState(0);

  // PanResponder dựng một lần nên handler không thấy được state mới; đọc qua ref.
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  trackWidthRef.current = trackWidth;
  valueRef.current = value;
  onChangeRef.current = onChange;

  const lastStep = Math.max(stepCount - 1, 1);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const moveToPosition = useCallback(
    (x: number) => {
      const width = trackWidthRef.current;
      if (width <= 0) return;

      const nextStep = stepFromTouch(x, width, stepCount);

      if (nextStep === valueRef.current) return;

      stepHaptic();
      onChangeRef.current(nextStep);
    },
    [stepCount]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        moveToPosition(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => {
        moveToPosition(event.nativeEvent.locationX);
      },
    })
  ).current;

  const usableWidth = usableTrackWidth(trackWidth);
  const thumbLeft = offsetForStep(value, trackWidth, stepCount);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: lastStep, now: value }}
      accessibilityActions={[
        { name: "increment", label: "Chữ to hơn" },
        { name: "decrement", label: "Chữ nhỏ hơn" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") {
          onChange(Math.min(value + 1, lastStep));
        } else if (event.nativeEvent.actionName === "decrement") {
          onChange(Math.max(value - 1, 0));
        }
      }}
      style={styles.root}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View
        style={[styles.track, { backgroundColor: colors.borderStrong }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.track,
          styles.trackFilled,
          { backgroundColor: colors.text, width: THUMB_WIDTH / 2 + thumbLeft },
        ]}
        pointerEvents="none"
      />

      {Array.from({ length: stepCount }, (_, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.tick,
            {
              backgroundColor: colors.textMuted,
              left:
                THUMB_WIDTH / 2 +
                (index / lastStep) * usableWidth -
                TICK_SIZE / 2,
            },
          ]}
        />
      ))}

      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: thumbLeft,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 44,
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackFilled: {
    right: undefined,
  },
  tick: {
    position: "absolute",
    bottom: 8,
    width: TICK_SIZE,
    height: TICK_SIZE,
    borderRadius: TICK_SIZE / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
