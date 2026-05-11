import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import HomeStack from "./HomeStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";

const Tab = createBottomTabNavigator();

const TAB_HEIGHT = 56;

function getDeepFocusedRouteName(route: any): string | undefined {
  const directFocusedRouteName = getFocusedRouteNameFromRoute(route);
  const nestedState = route.state;

  if (!nestedState || !("routes" in nestedState)) {
    return directFocusedRouteName ?? route.name;
  }

  const nestedRoute = nestedState.routes[nestedState.index ?? 0];

  if (!nestedRoute) {
    return directFocusedRouteName ?? route.name;
  }

  return getDeepFocusedRouteName(nestedRoute) ?? directFocusedRouteName ?? route.name;
}

export default function Tabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: "#E31E24",
        tabBarStyle: {
          backgroundColor: "#fff",
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
        options={({ route }) => {
          const routeName = getDeepFocusedRouteName(route) ?? "Home";
          const isMeetingScanner = routeName === "ShareholdersMeetingScanner";

          return {
            title: "Trang chủ",
            tabBarActiveTintColor: isMeetingScanner ? "#fff" : "#E31E24", // ← thêm dòng này
            tabBarInactiveTintColor: isMeetingScanner
              ? "rgba(255,255,255,0.68)"
              : undefined, // ← thêm dòng này
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
            freezeOnBlur: true,
            tabBarStyle: [
              {
                backgroundColor: isMeetingScanner ? "#3A3A3A" : "#fff",
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isMeetingScanner ? "#000" : undefined,
                height: TAB_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom,
              },
            ],
          };
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
            tabBarActiveTintColor: isScanScreen ? "#fff" : "#E31E24",
            tabBarInactiveTintColor: isScanScreen
              ? "rgba(255,255,255,0.68)"
              : undefined,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={24}
                color={color}
              />
            ),
            tabBarStyle: [
              {
                backgroundColor: isScanScreen ? "#3A3A3A" : "#fff",
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
