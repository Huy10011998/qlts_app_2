import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

import HomeStack from "./HomeStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";

const Tab = createBottomTabNavigator();

const TAB_HEIGHT = 56;

export default function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: "#fff",
        tabBarStyle: {
          backgroundColor: "#FF3333",
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
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
          freezeOnBlur: true,
        }}
      />

      {/* SCAN */}
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Scan";
          const isScanScreen = routeName === "Scan";

          return {
            title: "Quét QR",
            tabBarIcon: ({ color }) => (
              <Ionicons name="qr-code-outline" size={24} color={color} />
            ),
            tabBarStyle: [
              {
                backgroundColor: isScanScreen ? "#3A3A3A" : "#FF3333",
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: "#000",
                height: TAB_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom,
              },
            ],
          };
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
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
