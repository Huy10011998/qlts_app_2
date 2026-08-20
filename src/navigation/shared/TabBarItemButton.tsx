import React from "react";
import { UnscaledText } from "../../utils/helpers/textScaling";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Rect } from "react-native-svg";

import { useAppColors } from "../../utils/helpers/colors";
import {
  TAB_ACTIVE_COLOR,
  TAB_HEIGHT,
  TAB_INVERTED_INACTIVE_COLOR,
  useTabBarInverted,
} from "./tabBarTheme";

export const ICON_TILE_SIZE = 32;
const ICON_TILE_RADIUS = 10;
const INDICATOR_WIDTH = 48;

type TabBarItemConfig = {
  label: string;
  /** Tên icon Ionicons dạng đầy (dùng khi tab đang được chọn). */
  icon: string;
  /** Tên icon Ionicons dạng viền (dùng khi tab không được chọn). */
  iconOutline: string;
  iconSize?: number;
};

function TabBarItemButton({
  label,
  icon,
  iconOutline,
  iconSize = 23,
  onPress,
  onLongPress,
  testID,
  style,
  ...a11yProps
}: BottomTabBarButtonProps & TabBarItemConfig) {
  const colors = useAppColors();
  const inverted = useTabBarInverted();
  const isFocused = a11yProps["aria-selected"] === true;
  const inactiveColor = inverted ? TAB_INVERTED_INACTIVE_COLOR : colors.textSub;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      aria-label={a11yProps["aria-label"] ?? label}
      aria-selected={isFocused}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      activeOpacity={0.82}
      // `style` của react-navigation đứng trước: trên tablet (chiều rộng ≥ 768)
      // nó xếp nhãn cạnh icon bằng `flexDirection: "row"`, phá layout dọc của ô
      // tab và làm vạch active lệch khỏi giữa. Layout của ô tab phải thắng.
      style={[style, styles.wrapper]}
    >
      {/* Vạch active là con nằm trong luồng layout, luôn render và chỉ đổi màu —
          không phải lớp `position: absolute` phủ lên đỉnh ô tab. Cách cũ phụ
          thuộc vào align/justify của ô tab để canh ngang và vào thứ tự vẽ của
          Android để không bị nền thanh tab ăn mất, nên có máy chỉ thấy vạch ở
          một ô. Giữ nguyên chỗ ngồi: ô tab bỏ `paddingTop`, khoảng hở 7px cũ
          chuyển thành `marginTop` của ô icon. */}
      <View
        style={[styles.indicator, isFocused && styles.indicatorActive]}
        pointerEvents="none"
      />
      <View style={styles.iconTile}>
        {/* Nền bo góc vẽ bằng SVG chứ không phải `backgroundColor` +
            `borderRadius` của View: trên Android nền bo góc của View không ăn ở
            đây nên ô đỏ ra hình vuông, còn iOS thì bo. SVG vẽ đúng một hình trên
            cả hai nền. */}
        {isFocused ? (
          <Svg
            width={ICON_TILE_SIZE}
            height={ICON_TILE_SIZE}
            style={StyleSheet.absoluteFill}
          >
            <Rect
              width={ICON_TILE_SIZE}
              height={ICON_TILE_SIZE}
              rx={ICON_TILE_RADIUS}
              ry={ICON_TILE_RADIUS}
              fill={TAB_ACTIVE_COLOR}
            />
          </Svg>
        ) : null}
        <Ionicons
          name={isFocused ? icon : iconOutline}
          // Khi active, icon nằm trong ô nền đỏ nên phải nhỏ lại để còn thấy
          // phần nền quanh nó.
          size={isFocused ? iconSize - 4 : iconSize}
          color={isFocused ? "#fff" : inactiveColor}
        />
      </View>
      <UnscaledText
        numberOfLines={1}
        allowFontScaling={false}
        style={[
          styles.label,
          { color: isFocused ? TAB_ACTIVE_COLOR : inactiveColor },
          isFocused && styles.labelFocused,
        ]}
      >
        {label}
      </UnscaledText>
    </TouchableOpacity>
  );
}

/**
 * `tabBarButton` chỉ nhận props của navigator, nên cấu hình icon/nhãn được gắn
 * sẵn qua factory này. Gọi ở scope module để component không bị tạo lại mỗi lần
 * render.
 */
export function createTabBarButton(config: TabBarItemConfig) {
  const Button = (props: BottomTabBarButtonProps) => (
    <TabBarItemButton {...props} {...config} />
  );
  Button.displayName = `TabBarButton(${config.label})`;
  return Button;
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
    paddingBottom: 6,
  },
  indicator: {
    width: INDICATOR_WIDTH,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: TAB_ACTIVE_COLOR,
  },
  iconTile: {
    // 7px cũ của `paddingTop` trừ 3px chiều cao vạch active, để icon vẫn ngồi
    // đúng chỗ như trước.
    marginTop: 4,
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  labelFocused: {
    fontWeight: "700",
  },
});
