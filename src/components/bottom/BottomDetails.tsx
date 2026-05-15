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
import { C } from "../../utils/helpers/colors";

const SHELL_INSET = 12;

export default function BottomBarDetails({
  tabs,
  activeTab,
  onTabPress,
}: BottomBarProps) {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const BAR_WIDTH = SCREEN_WIDTH - SHELL_INSET * 2;
  const { nameClass } = useParams();
  const { can, loaded } = usePermission();

  const hasAttachPermission = useMemo(() => {
    if (!loaded || !nameClass) return false;
    return can(nameClass, "AttachFile");
  }, [can, loaded, nameClass]);
  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (tab.key === "attach") return hasAttachPermission;
      return true;
    });
  }, [tabs, hasAttachPermission]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;

    if (!visibleTabs.find((t) => t.key === activeTab)) {
      onTabPress(visibleTabs[0].key, visibleTabs[0].label);
    }
  }, [visibleTabs, activeTab, onTabPress]);

  const tabCount = visibleTabs.length || 1;
  const TAB_WIDTH = BAR_WIDTH / tabCount;
  const UNDERLINE_WIDTH = TAB_WIDTH * 0.6;
  const activeIndex = visibleTabs.findIndex((t) => t.key === activeTab);
  const index = activeIndex >= 0 ? activeIndex : 0;

  const startX = index * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2;
  const underlineX = useRef(new Animated.Value(startX)).current;

  const moveUnderlineTo = React.useCallback(
    (i: number) => i * TAB_WIDTH + (TAB_WIDTH - UNDERLINE_WIDTH) / 2,
    [TAB_WIDTH, UNDERLINE_WIDTH],
  );

  useEffect(() => {
    underlineX.setValue(startX);
  }, [startX, underlineX]);

  useEffect(() => {
    Animated.spring(underlineX, {
      toValue: moveUnderlineTo(index),
      useNativeDriver: true,
    }).start();
  }, [index, moveUnderlineTo, underlineX]);

  const handlePress = (tabKey: string, label: string, i: number) => {
    onTabPress(tabKey, label);
    Animated.spring(underlineX, {
      toValue: moveUnderlineTo(i),
      useNativeDriver: true,
    }).start();
  };

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell}>
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
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isActive ? C.red : "#8A95A3"}
                />
              </View>
              <Text
                style={[
                  styles.bottomLabel,
                  isActive && styles.bottomLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: SHELL_INSET,
    right: SHELL_INSET,
    bottom: 10,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    height: 74,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    shadowColor: "#1A2340",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden",
  },
  bottomItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    flexShrink: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FB",
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: "#FFF3F3",
  },
  bottomLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#8A95A3",
  },
  bottomLabelActive: { fontWeight: "700", color: C.red },
  underline: {
    position: "absolute",
    top: 0,
    height: 3,
    backgroundColor: C.red,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
