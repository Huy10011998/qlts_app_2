import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HUMP_HALF_WIDTH, HUMP_RISE } from "./tabBarTheme";

type TabBarBackgroundProps = {
  backgroundColor: string;
  borderTopColor: string;
};

/**
 * SVG của cái mu chồng xuống dưới mép thanh tab một chút rồi mới hết, để chỗ
 * nối với nền phẳng không hở ra một đường chỉ do làm tròn pixel.
 */
const HUMP_OVERLAP = 2;

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
 * react-navigation tự đặt nó phủ kín thanh tab và không nhận touch — và cũng
 * chính vì có nó mà react-navigation set `backgroundColor: "transparent"` cho
 * thanh tab, tức đây là chỗ DUY NHẤT vẽ nền.
 *
 * Vì vậy mặt phẳng của thanh tab phải là `backgroundColor` của View chứ không
 * vẽ bằng SVG: SVG hụt một nhịp là thanh tab trong suốt, nhìn xuyên xuống thấy
 * nội dung màn hình phía sau (đã gặp trên Android). SVG chỉ còn lo đúng cái mu
 * cong nhô lên trên mép — phần bắt buộc phải vẽ ngoài bounds — nên hỏng lắm thì
 * cũng chỉ mất cái mu, không mất nền.
 */
export default function TabBarBackground({
  backgroundColor,
  borderTopColor,
}: TabBarBackgroundProps) {
  const [width, setWidth] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  const topEdge = width > 0 ? buildTopEdge(width) : "";

  return (
    <View
      style={[styles.root, { backgroundColor }]}
      onLayout={handleLayout}
    >
      {topEdge ? (
        <Svg
          width={width}
          height={HUMP_RISE + HUMP_OVERLAP}
          style={styles.hump}
        >
          {/* Mu cong, khép đáy xuống dưới mép thanh tab để liền với nền phẳng. */}
          <Path
            d={`${topEdge} L ${width} ${HUMP_RISE + HUMP_OVERLAP} L 0 ${
              HUMP_RISE + HUMP_OVERLAP
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
  hump: {
    position: "absolute",
    left: 0,
    top: -HUMP_RISE,
  },
});
