import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Platform, Keyboard } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";

const Tab = createBottomTabNavigator();

const TAB_HEIGHT = 56;

export default function Tabs() {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ==========================
  // KEYBOARD LISTENER
  // ==========================
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: keyboardVisible ? 0 : TAB_HEIGHT + insets.bottom,
            paddingBottom: keyboardVisible ? 0 : insets.bottom,
            opacity: keyboardVisible ? 0 : 1,
          },
        ],

        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#ffd6d6",
      }}
    >
      {/* HOME */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* SCAN */}
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          title: "Quét QR",
          tabBarIcon: ({ color }) => (
            <Ionicons name="qr-code-outline" size={28} color={color} />
          ),
        }}
      />

      {/* SETTING */}
      <Tab.Screen
        name="SettingTab"
        component={SettingStack}
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FF3333",
    borderTopWidth: 0,

    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
        }
      : {
          elevation: 20,
        }),
  },

  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
