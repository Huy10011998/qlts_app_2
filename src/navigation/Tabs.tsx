import React from "react";
import { Keyboard, Platform, StyleSheet, type ViewStyle } from "react-native";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import HomeStack from "./HomeStack";
import FeatureStack from "./FeatureStack";
import CameraStack from "./CameraStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";
import ScanTabButton from "./shared/ScanTabButton";
import TabBarBackground from "./shared/TabBarBackground";
import { createTabBarButton } from "./shared/TabBarItemButton";
import { HomeMenuProvider } from "../screens/Home/shared/HomeMenuProvider";
import {
  INVERTED_TAB_BAR_MARKER,
  TAB_INVERTED_BG,
  TabBarInvertedProvider,
  createTabBarStyle,
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
    activeDescriptor?.options.tabBarBackground === INVERTED_TAB_BAR_MARKER;

  // Element dựng sẵn: `tabBarBackground` được react-navigation gọi như một
  // factory, không mount như component.
  const backgroundElement = (
    <TabBarBackground
      backgroundColor={usesInvertedStyle ? TAB_INVERTED_BG : backgroundColor}
      borderTopColor={usesInvertedStyle ? "#000" : borderTopColor}
    />
  );
  const renderBackground = () => backgroundElement;

  const descriptors =
    activeDescriptor && !isTabBarHidden
      ? {
          ...props.descriptors,
          [activeRoute.key]: {
            ...activeDescriptor,
            options: {
              ...activeDescriptor.options,
              tabBarStyle: createTabBarStyle({ bottomInset }),
              tabBarBackground: renderBackground,
            },
          },
        }
      : props.descriptors;

  return (
    <TabBarInvertedProvider value={usesInvertedStyle}>
      <BottomTabBar key={colorScheme} {...props} descriptors={descriptors} />
    </TabBarInvertedProvider>
  );
}

const HomeTabButton = createTabBarButton({
  label: "Trang chủ",
  icon: "home",
  iconOutline: "home-outline",
});

const FeatureTabButton = createTabBarButton({
  label: "Chức năng",
  icon: "grid",
  iconOutline: "grid-outline",
  iconSize: 22,
});

const CameraTabButton = createTabBarButton({
  label: "Camera",
  icon: "videocam",
  iconOutline: "videocam-outline",
});

const SettingTabButton = createTabBarButton({
  label: "Cài đặt",
  icon: "settings",
  iconOutline: "settings-outline",
});

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
          // Trên tablet react-navigation tự chuyển sang xếp nhãn cạnh icon; các
          // ô tab ở đây tự vẽ icon + nhãn theo chiều dọc nên phải chốt cứng,
          // không thì thanh tab đổi hình trên máy màn rộng.
          tabBarLabelPosition: "below-icon",
          tabBarStyle: createTabBarStyle({ bottomInset: insets.bottom }),
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{ title: "Trang chủ", tabBarButton: HomeTabButton }}
        />

        <Tab.Screen
          name="FeatureTab"
          component={FeatureStack}
          options={{ title: "Chức năng", tabBarButton: FeatureTabButton }}
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
              // Màu nền thật do ThemeAwareTabBar quyết định; đây chỉ là cờ báo
              // màn quét muốn thanh tab nền tối.
              tabBarBackground: isScanScreen
                ? INVERTED_TAB_BAR_MARKER
                : undefined,
            };
          }}
        />

        <Tab.Screen
          name="CameraTab"
          component={CameraStack}
          options={{ title: "Camera", tabBarButton: CameraTabButton }}
        />

        <Tab.Screen
          name="SettingTab"
          component={SettingStack}
          options={{
            title: "Cài đặt",
            tabBarButton: SettingTabButton,
          }}
        />
      </Tab.Navigator>
    </HomeMenuProvider>
  );
}
