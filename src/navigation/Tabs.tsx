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
  createTabBarStyle,
  tabBarStyles,
} from "./shared/tabBarTheme";
import { useAppColors, useStrongBorderColor } from "../utils/helpers/colors";
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

export default function Tabs() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const tabBorderColor = useStrongBorderColor();
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    Keyboard.dismiss();
  }, []);
  const renderTabBar = React.useCallback(
    (props: BottomTabBarProps) => (
      <ThemeAwareTabBar
        {...props}
        backgroundColor={colors.surface}
        borderTopColor={tabBorderColor}
        bottomInset={insets.bottom}
        colorScheme={colorScheme}
      />
    ),
    [colorScheme, colors.surface, tabBorderColor, insets.bottom],
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
            borderTopColor: tabBorderColor,
          }),
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{ title: "Trang chủ", tabBarIcon: HomeTabIcon }}
        />

        <Tab.Screen
          name="FeatureTab"
          component={FeatureStack}
          options={{ title: "Chức năng", tabBarIcon: FeatureTabIcon }}
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
                borderTopColor: isScanScreen ? "#000" : tabBorderColor,
              }),
            };
          }}
        />

        <Tab.Screen
          name="CameraTab"
          component={CameraStack}
          options={{ title: "Camera", tabBarIcon: CameraTabIcon }}
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
