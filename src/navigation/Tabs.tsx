import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
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
import { useAppColors, useHairlineBorderColor } from "../utils/helpers/colors";
import { useColorScheme } from "../hooks/useColorScheme";

const Tab = createBottomTabNavigator();

function ThemeAwareTabBar({
  backgroundColor,
  borderTopColor,
  bottomInset,
  colorScheme,
  ...props
}: BottomTabBarProps & {
  backgroundColor: string;
  borderTopColor: string;
  bottomInset: number;
  colorScheme: "light" | "dark";
}) {
  const activeRoute = props.state.routes[props.state.index];
  const activeDescriptor = props.descriptors[activeRoute.key];
  const activeTabBarStyle = StyleSheet.flatten(
    activeDescriptor?.options.tabBarStyle,
  ) as ViewStyle | undefined;
  const isTabBarHidden = activeTabBarStyle?.display === "none";
  // Trust the background color the screen's own `options` already resolved
  // instead of re-deriving the focused route here. Re-deriving used a different
  // fallback than the screens do (route.state isn't hydrated yet right after
  // login), so the inverted tint colors could be applied while this override
  // reset the background to `colors.surface` — white text on a white tab bar.
  const usesInvertedStyle = activeTabBarStyle?.backgroundColor === TAB_INVERTED_BG;

  const descriptors = activeDescriptor
    ? {
        ...props.descriptors,
        [activeRoute.key]: {
          ...activeDescriptor,
          options: {
            ...activeDescriptor.options,
            // Descriptors for a blurred tab can retain the previous theme on
            // Android. Override the active descriptor with concrete colors so
            // returning to CameraList cannot reuse a dark tab bar.
            tabBarStyle: isTabBarHidden
              ? activeDescriptor.options.tabBarStyle
              : createTabBarStyle({
                  bottomInset,
                  backgroundColor: usesInvertedStyle
                    ? TAB_INVERTED_BG
                    : backgroundColor,
                  borderTopColor: usesInvertedStyle ? "#000" : borderTopColor,
                }),
          },
        },
      }
    : props.descriptors;

  return (
    <BottomTabBar key={colorScheme} {...props} descriptors={descriptors} />
  );
}

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

  return (
    getDeepFocusedRouteName(nestedRoute) ?? directFocusedRouteName ?? route.name
  );
}

export default function Tabs() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const colorScheme = useColorScheme();
  const renderTabBar = React.useCallback(
    (props: BottomTabBarProps) => (
      <ThemeAwareTabBar
        {...props}
        backgroundColor={colors.surface}
        borderTopColor={hairlineBorderColor}
        bottomInset={insets.bottom}
        colorScheme={colorScheme}
      />
    ),
    [colorScheme, colors.surface, hairlineBorderColor, insets.bottom],
  );

  return (
    <Tab.Navigator
      // Rebuild only the visual tab bar when the appearance changes. Remounting
      // the entire navigator here used to recreate every nested native stack;
      // on Android that could leave CameraList with a stale horizontal screen
      // transform when returning from Settings.
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: tabBarStyles.label,
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarStyle: createTabBarStyle({
          bottomInset: insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: hairlineBorderColor,
        }),
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
            // Give Home a concrete tab bar style (like the last known-good 2.20
            // build) so the hide-on-keyboard animation can't leave it stuck
            // off-screen after login. Do NOT freeze Home on blur: freezing kept
            // the descriptor holding the previous theme's background color, so
            // switching dark->light from the Settings tab left this bar dark.
            // Without freeze the style re-evaluates and stays theme-correct.
            tabBarStyle: createTabBarStyle({
              bottomInset: insets.bottom,
              backgroundColor: isMeetingScanner
                ? TAB_INVERTED_BG
                : colors.surface,
              borderTopColor: isMeetingScanner ? "#000" : hairlineBorderColor,
            }),
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
            // Same as Home: keep a concrete, theme-aware tab bar style on every
            // route so the hide-on-keyboard animation can't strand it off-screen.
            tabBarStyle: createTabBarStyle({
              bottomInset: insets.bottom,
              backgroundColor: isScanScreen ? TAB_INVERTED_BG : colors.surface,
              borderTopColor: isScanScreen ? "#000" : hairlineBorderColor,
            }),
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
