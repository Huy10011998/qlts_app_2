import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { MenuItemCardProps } from "../../../types";
import { HOME_BRAND_RED } from "./homeTheme";
import {
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useHomeCardChrome } from "./homeBlockTone";
import GroupIconMarker from "./GroupIconMarker";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const localStyles = StyleSheet.create({
  animatedTouchable: {
    flex: 1,
  },
});

type HomeMenuItemCardProps = MenuItemCardProps & {
  viewPermission?: string;
  description?: string;
  fixedHeight?: boolean;
  homeGroup?: "vehicle" | "report";
};

export default function HomeMenuItemCard({
  iconName,
  label,
  notificationCount,
  index,
  onPress,
  fixedHeight = false,
  homeGroup,
}: HomeMenuItemCardProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const colors = useAppColors();

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 80,
      tension: 55,
      friction: 7,
    }).start();
  }, [index, scaleAnim]);

  // Báo cáo ghim ra Trang chủ dùng chung hình dạng card với chức năng (cùng
  // 4 cột, cùng chiều cao) để không phá lưới; chỉ màu nhấn tím và chấm biểu đồ
  // ở góc icon cho biết đó là báo cáo.
  const accentByGroup = {
    vehicle: { iconBg: colors.blueSurface, color: c.sky },
    report: { iconBg: colors.violetSurface, color: c.violet },
    feature: { iconBg: colors.pinkSurface, color: c.rose },
  };
  const accent = accentByGroup[homeGroup ?? "feature"];
  const theme = {
    bg: colors.surface,
    iconBg: accent.iconBg,
    color: accent.color,
    text: colors.text,
  };
  // Viền và mép trên tô theo loại mục chứ không theo màu khối Truy cập nhanh:
  // đó là chỗ phân biệt chức năng / phương tiện / báo cáo nằm chung một lưới.
  const chrome = useHomeCardChrome(theme.color);

  return (
    <AnimatedTouchable
      style={[
        localStyles.animatedTouchable,
        { transform: [{ scale: scaleAnim }] },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.card,
          chrome,
          fixedHeight ? styles.fixedHeightCard : null,
          { backgroundColor: theme.bg },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} color={theme.color} size={22} />
          {/* Trang chủ chỉ gắn chấm cho báo cáo (để không lẫn với chính chức
              năng cùng icon); màn Chức năng thì ô nào cũng có. */}
          {homeGroup === "report" ? <GroupIconMarker group="report" /> : null}
          {notificationCount ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.labelWrap}>
          <Text
            style={[styles.label, { color: theme.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

// Màu nền / viền / bóng đều đi qua `useHomeCardChrome` và theme từng mục, nên
// bảng style ở đây không còn phụ thuộc giao diện sáng / tối.
const makeStyles = () =>
  StyleSheet.create({
    // Mép trên 3pt (từ `useHomeCardChrome`) + paddingTop 8 cao đúng bằng thanh
    // màu 3pt + khoảng 8pt trước đây, nên `HOME_FEATURE_CARD_HEIGHT` giữ nguyên.
    card: {
      borderRadius: 16,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 8,
      alignItems: "center",
      overflow: "hidden",
    },
    fixedHeightCard: {
      flex: 1,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    badge: {
      position: "absolute",
      top: -3,
      right: -3,
      backgroundColor: HOME_BRAND_RED,
      borderRadius: 9,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: "white",
    },
    badgeText: {
      color: "white",
      fontSize: 9,
      fontWeight: "700",
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
      width: "100%",
      textAlignVertical: "center",
    },
    labelWrap: {
      minHeight: 34,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
  });
