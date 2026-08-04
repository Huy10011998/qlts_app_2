import React from "react";
import { Keyboard, Platform, StyleSheet, type ViewStyle } from "react-native";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import HomeStack from "./HomeStack";
import FeatureStack from "./FeatureStack";
import CameraStack from "./CameraStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";
import ScanTabButton from "./shared/ScanTabButton";
import { HomeMenuProvider } from "../screens/Home/shared/HomeMenuProvider";
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
  const usesInvertedStyle =
    activeTabBarStyle?.backgroundColor === TAB_INVERTED_BG;

  const descriptors = activeDescriptor
    ? {
        ...props.descriptors,
        [activeRoute.key]: {
          ...activeDescriptor,
          options: {
            ...activeDescriptor.options,
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

function FeatureTabIcon({ color }: { color: string }) {
  return <Ionicons name="grid" size={22} color={color} />;
}

function CameraTabIcon({ color }: { color: string }) {
  return <Ionicons name="videocam" size={24} color={color} />;
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

  React.useEffect(() => {
    Keyboard.dismiss();
  }, []);
  const getMeetingScannerAwareOptions = React.useCallback(
    (
      route: any,
      title: string,
      tabBarIcon: (props: { color: string }) => React.ReactElement,
    ) => {
      const routeName = getDeepFocusedRouteName(route) ?? "";
      const isMeetingScanner = routeName === "ShareholdersMeetingScanner";

      return {
        title,
        tabBarIcon,
        tabBarActiveTintColor: isMeetingScanner ? "#fff" : TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: isMeetingScanner
          ? TAB_INVERTED_INACTIVE_COLOR
          : undefined,
        tabBarStyle: createTabBarStyle({
          bottomInset: insets.bottom,
          backgroundColor: isMeetingScanner ? TAB_INVERTED_BG : colors.surface,
          borderTopColor: isMeetingScanner ? "#000" : hairlineBorderColor,
        }),
      };
    },
    [colors.surface, hairlineBorderColor, insets.bottom],
  );

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
    <HomeMenuProvider>
      <Tab.Navigator
        tabBar={renderTabBar}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: Platform.OS !== "ios",
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
          options={({ route }) =>
            getMeetingScannerAwareOptions(route, "Trang chủ", HomeTabIcon)
          }
        />

        <Tab.Screen
          name="FeatureTab"
          component={FeatureStack}
          options={({ route }) =>
            getMeetingScannerAwareOptions(route, "Chức năng", FeatureTabIcon)
          }
        />

        <Tab.Screen
          name="ScanTab"
          component={ScanStack}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "Scan";
            const isScanScreen = routeName === "Scan";

            return {
              title: "Quét QR",
              tabBarButton: ScanTabButton,
              tabBarStyle: createTabBarStyle({
                bottomInset: insets.bottom,
                backgroundColor: isScanScreen
                  ? TAB_INVERTED_BG
                  : colors.surface,
                borderTopColor: isScanScreen ? "#000" : hairlineBorderColor,
              }),
            };
          }}
        />

        <Tab.Screen
          name="CameraTab"
          component={CameraStack}
          options={({ route }) =>
            getMeetingScannerAwareOptions(route, "Camera", CameraTabIcon)
          }
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
    </HomeMenuProvider>
  );
}
