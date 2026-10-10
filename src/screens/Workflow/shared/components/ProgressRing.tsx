import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  KH_PROGRESS_COLOR,
  KH_PROGRESS_DONE_COLOR,
  KH_PROGRESS_TRACK_COLOR,
} from "../workflowConstants";
import { useAppColors } from "../../../../utils/helpers/colors";

type Props = {
  /** 0–100; null = chưa có việc → vòng xám, chữ "–". */
  percent: number | null | undefined;
  size?: number;
  strokeWidth?: number;
};

/** Vòng tiến độ % hoàn thành của kế hoạch (cùng màu web). */
export default function ProgressRing({ percent, size = 48, strokeWidth = 5 }: Props) {
  const c = useAppColors();
  const hasValue = percent != null && Number.isFinite(Number(percent));
  const value = hasValue ? Math.max(0, Math.min(100, Number(percent))) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 100 ? KH_PROGRESS_DONE_COLOR : KH_PROGRESS_COLOR;
  const fontSize = size >= 48 ? 12 : 10;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={KH_PROGRESS_TRACK_COLOR}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {hasValue && value > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - value / 100)}
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={[styles.text, { color: c.text, fontSize }]}
          maxFontSizeMultiplier={1.1}
        >
          {hasValue ? `${Math.round(value)}%` : "–"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
  },
});
