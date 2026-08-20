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
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";

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
  const hairlineBorderColor = useHairlineBorderColor();

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
  // 4 cột, cùng chiều cao) để không phá lưới; chỉ màu nhấn tím và icon tài liệu
  // cho biết đó là báo cáo.
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
          { borderColor: hairlineBorderColor },
          { shadowColor: colors.shadow },
          fixedHeight ? styles.fixedHeightCard : null,
          { backgroundColor: theme.bg },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: theme.color }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} color={theme.color} size={22} />
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      paddingTop: 0,
      paddingBottom: 8,
      paddingHorizontal: 8,
      alignItems: "center",
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    fixedHeightCard: {
      flex: 1,
    },
    accentBar: {
      height: 3,
      width: "100%",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      marginBottom: 8,
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
