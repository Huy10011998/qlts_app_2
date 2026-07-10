import React, { useEffect, useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { MenuItemCardProps } from "../../../types";
import { HOME_BRAND_RED } from "./homeTheme";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const localStyles = StyleSheet.create({
  animatedTouchable: {
    flex: 1,
  },
});

const HOME_FEATURE_FIXED_THEME = {
  bg: "#fff",
  iconBg: "#FFF0F6",
  color: "#DB2777",
  text: "#831843",
  border: "#FBCFE8",
};

const HOME_VEHICLE_THEME = {
  bg: "#FFFFFF",
  iconBg: "#E0F2FE",
  color: "#0284C7",
  text: "#075985",
  border: "#BAE6FD",
};

type HomeMenuItemCardProps = MenuItemCardProps & {
  viewPermission?: string;
  description?: string;
  isPinned?: boolean;
  onTogglePinned?: () => void;
  showPinButton?: boolean;
  fixedHeight?: boolean;
  homeGroup?: "vehicle";
};

export default function HomeMenuItemCard({
  iconName,
  label,
  notificationCount,
  index,
  onPress,
  isPinned = false,
  onTogglePinned,
  showPinButton = false,
  fixedHeight = false,
  homeGroup,
}: HomeMenuItemCardProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 80,
      tension: 55,
      friction: 7,
    }).start();
  }, [index, scaleAnim]);

  const theme =
    homeGroup === "vehicle" ? HOME_VEHICLE_THEME : HOME_FEATURE_FIXED_THEME;
  const handleTogglePinned = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onTogglePinned?.();
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
          fixedHeight ? styles.fixedHeightCard : null,
          { backgroundColor: theme.bg },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: theme.color }]} />
        {showPinButton ? (
          <TouchableOpacity
            style={[
              styles.pinButton,
              {
                backgroundColor: isPinned ? theme.color : theme.iconBg,
                borderColor: isPinned ? theme.color : theme.border,
              },
            ]}
            activeOpacity={0.76}
            onPress={handleTogglePinned}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={isPinned ? "checkmark" : "add"}
              size={14}
              color={isPinned ? "#fff" : theme.color}
            />
          </TouchableOpacity>
        ) : null}

        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} color={theme.color} size={22} />
          {notificationCount ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} allowFontScaling={false}>
                {notificationCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.labelWrap}>
          <Text
            style={[styles.label, { color: theme.text }]}
            allowFontScaling={false}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>

        <View style={[styles.arrowChip, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="arrow-forward" size={10} color={theme.color} />
        </View>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingTop: 0,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1A2340",
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
    lineHeight: 17,
    width: "100%",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  labelWrap: {
    minHeight: 32,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  arrowChip: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  pinButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
