import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import HomeStack from "./HomeStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";
import {
  TAB_ACTIVE_COLOR,
  TAB_INVERTED_BG,
  TAB_INVERTED_INACTIVE_COLOR,
  createTabBarStyle,
  tabBarStyles,
} from "./shared/tabBarTheme";

const Tab = createBottomTabNavigator();

function HomeTabIcon({ color }: { color: string }) {
  return <Ionicons name="home" size={24} color={color} />;
}

function ScanTabIcon({ color }: { color: string }) {
  return <MaterialCommunityIcons name="qrcode-scan" size={24} color={color} />;
}

function SettingTabIcon({ color }: { color: string }) {
  return <Ionicons name="settings" size={24} color={color} />;
}

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
        tabBarLabelStyle: tabBarStyles.label,
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarStyle: createTabBarStyle({ bottomInset: insets.bottom }),
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getDeepFocusedRouteName(route) ?? "Home";
          const isMeetingScanner = routeName === "ShareholdersMeetingScanner";

          return {
            title: "Trang chủ",
            tabBarActiveTintColor: isMeetingScanner ? "#fff" : TAB_ACTIVE_COLOR,
            tabBarInactiveTintColor: isMeetingScanner
              ? TAB_INVERTED_INACTIVE_COLOR
              : undefined,
            tabBarIcon: HomeTabIcon,
            freezeOnBlur: true,
            tabBarStyle: [
              createTabBarStyle({
                bottomInset: insets.bottom,
                backgroundColor: isMeetingScanner ? TAB_INVERTED_BG : "#fff",
                borderTopColor: isMeetingScanner ? "#000" : undefined,
              }),
            ],
          };
        }}
      />

      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Scan";
          const isScanScreen = routeName === "Scan";

          return {
            title: "Quét QR",
            tabBarActiveTintColor: isScanScreen ? "#fff" : TAB_ACTIVE_COLOR,
            tabBarInactiveTintColor: isScanScreen
              ? TAB_INVERTED_INACTIVE_COLOR
              : undefined,
            tabBarIcon: ScanTabIcon,
            tabBarStyle: [
              createTabBarStyle({
                bottomInset: insets.bottom,
                backgroundColor: isScanScreen ? TAB_INVERTED_BG : "#fff",
                borderTopColor: "#000",
              }),
            ],
          };
        }}
      />

      <Tab.Screen
        name="SettingTab"
        component={SettingStack}
        options={{
          title: "Cài đặt",
          tabBarIcon: SettingTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}
