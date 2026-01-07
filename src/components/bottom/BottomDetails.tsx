import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { BottomBarProps } from "../../types/Index";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function BottomBarDetails({
  tabs,
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const UNDERLINE_WIDTH = TAB_WIDTH * 0.6;

  // Khởi tạo underlineX đúng tab ban đầu
  const initialIndex = tabs.findIndex((t) => t.key === activeTab) ?? 0;
  const startX = initialIndex * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2;
  const underlineX = useRef(new Animated.Value(startX)).current;

  const moveUnderlineTo = (index: number) =>
    index * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2;

  // Cập nhật underline khi activeTab thay đổi
  useEffect(() => {
    const index = tabs.findIndex((t) => t.key === activeTab);
    if (index >= 0) {
      Animated.spring(underlineX, {
        toValue: moveUnderlineTo(index),
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab, tabs]);

  const handlePress = (tabKey: string, label: string, index: number) => {
    onTabPress(tabKey, label);
    Animated.spring(underlineX, {
      toValue: moveUnderlineTo(index),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.bottomBar}>
      {/* Thanh underline di chuyển */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.underline,
          { width: UNDERLINE_WIDTH, transform: [{ translateX: underlineX }] },
        ]}
      />
      {/* Danh sách tab */}
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.bottomItem, { width: TAB_WIDTH }]}
            onPress={() => handlePress(tab.key, tab.label, index)}
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
    paddingVertical: 1,
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

  bottomLabelActive: { opacity: 1, fontWeight: "800" },

  underline: {
    position: "absolute",
    bottom: 2.5,
    marginBottom: 5,
    height: 2,
    backgroundColor: "#FF3333",
    borderRadius: 1,
  },
});
