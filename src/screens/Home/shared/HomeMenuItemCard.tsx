import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { MenuItemCardProps } from "../../../types";
import { HOME_BRAND_RED, HOME_CARD_THEME } from "./homeTheme";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type HomeMenuItemCardProps = MenuItemCardProps & {
  viewPermission?: string;
  description?: string;
};

export default function HomeMenuItemCard({
  iconName,
  label,
  notificationCount,
  index,
  onPress,
  viewPermission,
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

  const theme = HOME_CARD_THEME[viewPermission ?? "default"] ?? HOME_CARD_THEME.default;

  return (
    <AnimatedTouchable
      style={{ flex: 1, transform: [{ scale: scaleAnim }] }}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={[styles.card, { backgroundColor: theme.bg }]}>
        <View style={[styles.accentBar, { backgroundColor: theme.color }]} />

        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} color={theme.color} size={22} />
          {notificationCount ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.label, { color: theme.color }]} numberOfLines={2}>
          {label}
        </Text>

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
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accentBar: {
    height: 3,
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 8,
  },
  arrowChip: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});
