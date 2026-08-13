import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HUMP_HALF_WIDTH, HUMP_RISE } from "./tabBarTheme";

type TabBarBackgroundProps = {
  backgroundColor: string;
  borderTopColor: string;
};

/**
 * Mép trên thanh tab: đoạn thẳng hai bên, ở giữa cong nhô lên bao lấy nút Quét
 * QR. Hai đoạn Bézier có điểm điều khiển nằm ngang tại chỗ nối nên tiếp tuyến
 * khớp với đoạn thẳng, đường cong không bị gãy khúc.
 *
 * Gốc toạ độ nằm cao hơn thanh tab `HUMP_RISE` để chừa chỗ cho cái mu, nên mép
 * thẳng ở y = HUMP_RISE.
 */
export const buildTopEdge = (width: number) => {
  const cx = width / 2;
  const start = cx - HUMP_HALF_WIDTH;
  const end = cx + HUMP_HALF_WIDTH;
  // Điểm điều khiển đặt ở nửa đoạn: càng gần chỗ nối thì mu càng thoải.
  const grip = HUMP_HALF_WIDTH / 2;

  return [
    `M 0 ${HUMP_RISE}`,
    `L ${start} ${HUMP_RISE}`,
    `C ${start + grip} ${HUMP_RISE} ${cx - grip} 0 ${cx} 0`,
    `C ${cx + grip} 0 ${end - grip} ${HUMP_RISE} ${end} ${HUMP_RISE}`,
    `L ${width} ${HUMP_RISE}`,
  ].join(" ");
};

/**
 * Nền của thanh tab. Được truyền qua option `tabBarBackground` nên
 * react-navigation tự đặt nó phủ kín thanh tab và không nhận touch. Chỉ cái mu
 * vẽ tràn lên trên thanh tab, phần còn lại phía trên vẫn trong suốt để không
 * che nội dung của màn hình.
 */
export default function TabBarBackground({
  backgroundColor,
  borderTopColor,
}: TabBarBackgroundProps) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  };

  const topEdge = size.width > 0 ? buildTopEdge(size.width) : "";

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {topEdge ? (
        <Svg
          width={size.width}
          height={size.height + HUMP_RISE}
          style={styles.canvas}
        >
          {/* Phần nền: mép trên như trên, ba cạnh còn lại ăn ra hết thanh tab. */}
          <Path
            d={`${topEdge} L ${size.width} ${size.height + HUMP_RISE} L 0 ${
              size.height + HUMP_RISE
            } Z`}
            fill={backgroundColor}
          />
          {/* Chỉ kẻ mép trên, khỏi kẻ luôn ba cạnh kia. */}
          <Path
            d={topEdge}
            fill="none"
            stroke={borderTopColor}
            strokeWidth={1}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Tràn lên trên thanh tab đúng bằng độ cao cái mu.
  canvas: {
    position: "absolute",
    left: 0,
    top: -HUMP_RISE,
  },
});
