import React from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { C } from "../../utils/helpers/colors";
import {
  SCAN_BUTTON_RISE,
  SCAN_BUTTON_SIZE,
  TAB_HEIGHT,
} from "./tabBarTheme";

const ICON_SIZE = 24;
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
      <View style={[styles.circle, isFocused && styles.circleFocused]}>
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
      <View style={styles.labelPill}>
        <Text numberOfLines={1} allowFontScaling={false} style={styles.label}>
          Quét QR
        </Text>
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
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 4,
  },
  circle: {
    // Nhô lên khỏi mép thanh tab, nằm gọn trong mu cong mà nền thanh tab vẽ ra.
    marginTop: -SCAN_BUTTON_RISE,
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: SCAN_BUTTON_SIZE / 2,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.red,
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  circleFocused: {
    // Đang ở màn quét thì thanh tab chuyển sang nền tối; viền sáng giữ cho nút
    // không chìm vào nền.
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  scanLine: {
    position: "absolute",
    width: ICON_SIZE - 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#fff",
  },
  labelPill: {
    // Canh cho nhãn viên thuốc nằm ngang hàng với nhãn của các tab còn lại.
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.red,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});
