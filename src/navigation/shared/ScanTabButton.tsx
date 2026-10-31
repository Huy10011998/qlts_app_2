import React from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Svg, { Rect } from "react-native-svg";

import { C } from "../../utils/helpers/colors";
import { SCAN_TILE_HEIGHT, SCAN_TILE_WIDTH, TAB_HEIGHT } from "./tabBarTheme";

const ICON_SIZE = 22;
const TILE_RADIUS = 12;
/** Vạch quét chạy trong lòng khung 4 góc, nên biên độ lấy theo nửa khung. */
const SCAN_LINE_TRAVEL = ICON_SIZE / 2 - 4;
const SCAN_LINE_DURATION = 1100;

export default function ScanTabButton({
  onPress,
  onLongPress,
  testID,
  style,
  ...a11yProps
}: BottomTabBarButtonProps) {
  const isFocused = a11yProps["aria-selected"] === true;
  const progress = React.useRef(new Animated.Value(0)).current;
  // null = chưa biết: chờ đọc xong cờ trợ năng rồi mới chạy, khỏi chớp một
  // nhịp animation với người đã bật giảm chuyển động.
  const [reduceMotion, setReduceMotion] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (reduceMotion !== false) return;

    // Chạy từ trên xuống rồi ngược lại, không nhảy giật về đầu.
    const sweep = (toValue: number) =>
      Animated.timing(progress, {
        toValue,
        duration: SCAN_LINE_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const animation = Animated.loop(
      Animated.sequence([sweep(1), sweep(0)]),
    );
    animation.start();

    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [progress, reduceMotion]);

  const scanLineStyle = {
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-SCAN_LINE_TRAVEL, SCAN_LINE_TRAVEL],
        }),
      },
    ],
    // Mờ dần ở hai đầu để vạch không cụt ngang khi tới sát khung.
    opacity: progress.interpolate({
      inputRange: [0, 0.15, 0.85, 1],
      outputRange: [0.15, 1, 1, 0.15],
    }),
  };

  return (
    <TouchableOpacity
      // `style` của react-navigation đứng trước: trên tablet (chiều rộng ≥ 768)
      // nó đổi ô tab sang `flexDirection: "row"` để xếp nhãn cạnh icon, làm vòng
      // tròn và nhãn của nút này nằm ngang nhau. Layout của nút phải thắng.
      style={[style, styles.wrapper]}
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      testID={testID}
      activeOpacity={0.82}
      accessibilityRole="button"
      aria-label="Quét QR"
      aria-selected={isFocused}
    >
      {/* Ô đỏ nằm gọn trong viên thanh tab — thay vòng tròn nhô lên trong mu
          cong cũ — nhưng vẫn là ô duy nhất tô đặc nên nhìn là thấy nút quét. */}
      <View style={styles.tile}>
        {/* Nền bo góc vẽ bằng SVG: nền bo góc của View trên thanh tab Android
            từng ra hình vuông. Đang ở màn quét (thanh tab nền tối) thì thêm viền
            sáng để ô không chìm vào nền. */}
        <Svg
          width={SCAN_TILE_WIDTH}
          height={SCAN_TILE_HEIGHT}
          style={StyleSheet.absoluteFill}
        >
          <Rect
            x={isFocused ? 1 : 0}
            y={isFocused ? 1 : 0}
            width={SCAN_TILE_WIDTH - (isFocused ? 2 : 0)}
            height={SCAN_TILE_HEIGHT - (isFocused ? 2 : 0)}
            rx={TILE_RADIUS}
            ry={TILE_RADIUS}
            fill={C.red}
            stroke={isFocused ? "rgba(255,255,255,0.9)" : undefined}
            strokeWidth={isFocused ? 2 : 0}
          />
        </Svg>
        {/* Khung 4 góc giống icon quét của MoMo, thay vì hình mã QR đặc. */}
        <MaterialCommunityIcons
          name="scan-helper"
          size={ICON_SIZE}
          color="#fff"
        />
        {reduceMotion === false ? (
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    height: TAB_HEIGHT,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  tile: {
    width: SCAN_TILE_WIDTH,
    height: SCAN_TILE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  scanLine: {
    position: "absolute",
    width: ICON_SIZE - 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#fff",
  },
});
