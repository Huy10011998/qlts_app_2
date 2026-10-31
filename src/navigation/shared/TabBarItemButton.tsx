import React from "react";
import { UnscaledText } from "../../utils/helpers/textScaling";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Circle, Rect } from "react-native-svg";

import { useAppColors } from "../../utils/helpers/colors";
import {
  TAB_ACTIVE_COLOR,
  TAB_HEIGHT,
  TAB_INVERTED_BG,
  TAB_INVERTED_INACTIVE_COLOR,
  useTabBarInverted,
} from "./tabBarTheme";

const AVATAR_SIZE = 26;
/** Vòng quanh ảnh đại diện: cách ảnh 1pt, dày 2pt. */
const AVATAR_RING_SIZE = AVATAR_SIZE + 6;
/** Nền nhạt sau tab đang chọn: cao 44, thụt vào 3pt mỗi bên ô tab. */
const PILL_INSET_X = 3;
const PILL_HEIGHT = 44;

type TabBarItemConfig = {
  label: string;
  /** Tên icon Ionicons dạng đầy (dùng khi tab đang được chọn). */
  icon: string;
  /** Tên icon Ionicons dạng viền (dùng khi tab không được chọn). */
  iconOutline: string;
  iconSize?: number;
};

/** Phần thay đổi theo dữ liệu, đọc bằng hook trong `createTabBarButton`. */
type TabBarItemDynamic = {
  /** Số đỏ ở góc icon như Facebook; 0 / không có thì ẩn. */
  badgeCount?: number;
  /** Có thì thay icon bằng ảnh đại diện tròn, như tab Menu của Facebook. */
  avatarUrl?: string;
};

/**
 * Ô tab kiểu Facebook bản mới: chỉ có icon (nhãn để cho trình đọc màn hình), tab
 * đang chọn đổi icon sang dạng đầy màu nhấn và có nền nhạt bo tròn phía sau.
 */
function TabBarItemButton({
  label,
  icon,
  iconOutline,
  iconSize = 26,
  badgeCount,
  avatarUrl,
  onPress,
  onLongPress,
  testID,
  style,
  ...a11yProps
}: BottomTabBarButtonProps & TabBarItemConfig & TabBarItemDynamic) {
  const colors = useAppColors();
  const inverted = useTabBarInverted();
  const isFocused = a11yProps["aria-selected"] === true;
  const inactiveColor = inverted ? TAB_INVERTED_INACTIVE_COLOR : colors.text;
  const color = isFocused ? TAB_ACTIVE_COLOR : inactiveColor;
  const fallbackIcon = (
    <Ionicons
      name={isFocused ? icon : iconOutline}
      size={iconSize}
      color={color}
    />
  );

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
      // tab. Layout của ô tab phải thắng.
      style={[style, styles.wrapper]}
    >
      {isFocused ? (
        // Nền bo tròn vẽ bằng SVG: nền bo góc của View trên thanh tab Android
        // từng ra hình vuông.
        <View style={styles.pill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Rect
              width="100%"
              height="100%"
              rx={PILL_HEIGHT / 2}
              ry={PILL_HEIGHT / 2}
              fill={inverted ? "rgba(255,255,255,0.14)" : colors.redSurface}
            />
          </Svg>
        </View>
      ) : null}
      <View style={styles.iconBox}>
        {avatarUrl ? (
          <TabAvatar
            // Đổi ảnh thì dựng lại, để ảnh mới được thử tải dù ảnh cũ từng lỗi.
            key={avatarUrl}
            uri={avatarUrl}
            ringColor={color}
            focused={isFocused}
            fallback={fallbackIcon}
          />
        ) : (
          fallbackIcon
        )}
        {badgeCount ? (
          <View
            style={[
              styles.badge,
              // Viền cùng màu nền thanh tab để số tách khỏi icon.
              { borderColor: inverted ? TAB_INVERTED_BG : colors.surface },
            ]}
          >
            {/* Viên cao cố định 16pt: không theo cỡ chữ, phóng to là xén số. */}
            <UnscaledText allowFontScaling={false} style={styles.badgeText}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </UnscaledText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Ảnh đại diện tròn thay icon. Ảnh lỗi (link hỏng, mất mạng) thì quay về icon
 * thường. Có vòng như Facebook — cùng màu icon: đậm khi thường, đỏ khi đang
 * chọn. Vòng vẽ bằng SVG: viền bo tròn của View trên thanh tab Android từng ra
 * hình vuông.
 */
function TabAvatar({
  uri,
  ringColor,
  focused,
  fallback,
}: {
  uri: string;
  ringColor: string;
  focused: boolean;
  fallback: React.ReactElement;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) return fallback;

  return (
    <View style={styles.avatarWrap}>
      <Svg
        width={AVATAR_RING_SIZE}
        height={AVATAR_RING_SIZE}
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx={AVATAR_RING_SIZE / 2}
          cy={AVATAR_RING_SIZE / 2}
          r={AVATAR_RING_SIZE / 2 - 1}
          stroke={ringColor}
          strokeWidth={focused ? 2 : 1.5}
          fill="none"
        />
      </Svg>
      <Image
        source={{ uri }}
        style={styles.avatar}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const useNoDynamic = (): TabBarItemDynamic => ({});

/**
 * `tabBarButton` chỉ nhận props của navigator, nên cấu hình icon/nhãn được gắn
 * sẵn qua factory này. Gọi ở scope module để component không bị tạo lại mỗi lần
 * render. `useDynamic` là hook đọc phần đổi theo dữ liệu (số đỏ, ảnh đại diện).
 */
export function createTabBarButton(
  config: TabBarItemConfig,
  useDynamic: () => TabBarItemDynamic = useNoDynamic,
) {
  const Button = (props: BottomTabBarButtonProps) => {
    const dynamic = useDynamic();

    return <TabBarItemButton {...props} {...config} {...dynamic} />;
  };
  Button.displayName = `TabBarButton(${config.label})`;
  return Button;
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
  pill: {
    position: "absolute",
    left: PILL_INSET_X,
    right: PILL_INSET_X,
    top: (TAB_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
  },
  // Vuông cố định để số đỏ đặt theo toạ độ tuyệt đối: để `left` theo phần trăm
  // thì số chạy lệch hẳn sang ô tab bên cạnh (đã gặp trên iOS). Đủ chỗ cho cả
  // ảnh đại diện kèm vòng.
  iconBox: {
    width: AVATAR_RING_SIZE,
    height: AVATAR_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // Mép trái số đỏ ở quá giữa icon một chút, như Facebook.
  badge: {
    position: "absolute",
    top: -4,
    left: AVATAR_RING_SIZE / 2 + 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TAB_ACTIVE_COLOR,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    color: "#fff",
  },
  avatarWrap: {
    width: AVATAR_RING_SIZE,
    height: AVATAR_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});
