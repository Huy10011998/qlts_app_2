import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { BottomBarProps } from "../../types/Index";
import { usePermission } from "../../hooks/usePermission";
import { useParams } from "../../hooks/useParams";

export default function BottomBarDetails({
  tabs,
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const SCREEN_WIDTH = Dimensions.get("window").width;

  // PERMISSION
  const { nameClass } = useParams();

  const { can, loaded, permissions } = usePermission();

  const hasAttachPermission = useMemo(() => {
    if (!loaded || !nameClass) return false;
    return can(nameClass, "AttachFile");
  }, [loaded, nameClass, permissions]); // QUAN TRỌNG

  // FILTER TAB
  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (tab.key === "attach") return hasAttachPermission;
      return true;
    });
  }, [tabs, hasAttachPermission]);

  // RESET activeTab nếu tab bị ẩn
  useEffect(() => {
    if (visibleTabs.length === 0) return;

    if (!visibleTabs.find((t) => t.key === activeTab)) {
      onTabPress(visibleTabs[0].key, visibleTabs[0].label);
    }
  }, [visibleTabs, activeTab, onTabPress]);

  // SIZE
  if (visibleTabs.length === 0) {
    return null; // hoặc View rỗng
  }
  const TAB_WIDTH = SCREEN_WIDTH / visibleTabs.length;

  const UNDERLINE_WIDTH = TAB_WIDTH * 0.6;

  // UNDERLINE
  const activeIndex = visibleTabs.findIndex((t) => t.key === activeTab);
  const index = activeIndex >= 0 ? activeIndex : 0;

  const startX = index * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2;
  const underlineX = useRef(new Animated.Value(startX)).current;

  const moveUnderlineTo = (i: number) =>
    i * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2;

  useEffect(() => {
    underlineX.setValue(startX);
  }, [startX]);

  useEffect(() => {
    Animated.spring(underlineX, {
      toValue: moveUnderlineTo(index),
      useNativeDriver: true,
    }).start();
  }, [index]);

  // HANDLER
  const handlePress = (tabKey: string, label: string, i: number) => {
    onTabPress(tabKey, label);
    Animated.spring(underlineX, {
      toValue: moveUnderlineTo(i),
      useNativeDriver: true,
    }).start();
  };

  // RENDER
  return (
    <View style={styles.bottomBar}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.underline,
          { width: UNDERLINE_WIDTH, transform: [{ translateX: underlineX }] },
        ]}
      />

      {visibleTabs.map((tab, i) => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.bottomItem, { width: TAB_WIDTH }]}
            onPress={() => handlePress(tab.key, tab.label, i)}
            activeOpacity={0.8}
          >
            <Ionicons name={tab.icon} size={26} color="#FF3333" />
            <Text
              style={[styles.bottomLabel, isActive && styles.bottomLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomItem: { alignItems: "center", justifyContent: "center" },
  bottomLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
    color: "#FF3333",
  },
  bottomLabelActive: { fontWeight: "800" },
  underline: {
    position: "absolute",
    bottom: 8,
    height: 2,
    backgroundColor: "#FF3333",
    borderRadius: 1,
  },
});
