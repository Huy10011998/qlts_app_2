import React from "react";
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeStack from "./HomeStack";
import FeatureStack from "./FeatureStack";
import CameraStack from "./CameraStack";
import LichStack from "./LichStack";
import SettingStack from "./SettingStack";
import ScanStack from "./ScanStack";
import ScanTabButton from "./shared/ScanTabButton";
import TabBarBackground from "./shared/TabBarBackground";
import { createTabBarButton } from "./shared/TabBarItemButton";
import {
  HomeMenuProvider,
  useHomeMenuContext,
} from "../screens/Home/shared/HomeMenuProvider";
import ThongBaoBellPanel from "../screens/ThongBao/ThongBaoBellPanel";
import {
  INVERTED_TAB_BAR_MARKER,
  TAB_HEIGHT,
  TAB_INVERTED_BG,
  TabBarInvertedProvider,
  createTabBarStyle,
  getTabBarBottomOffset,
} from "./shared/tabBarTheme";
import {
  TabBarAutoHideProvider,
  useTabBarAutoHide,
} from "./shared/tabBarAutoHide";
import { useAppColors, useStrongBorderColor } from "../utils/helpers/colors";
import { useColorScheme } from "../hooks/useColorScheme";
import { usePermission } from "../hooks/usePermission";
import { useAppSelector } from "../store/hooks";
import { WORKFLOW_VIEW_CODE } from "../screens/Workflow/workflowMenu";

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
  const { progress: autoHideProgress } = useTabBarAutoHide();
  const overlap = TAB_HEIGHT + getTabBarBottomOffset(bottomInset);

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
    // Lớp trượt khi tự ẩn lúc cuộn (`tabBarAutoHide`). Không gắn `transform`
    // vào `tabBarStyle` được: BottomTabBar dùng chính `transform` của nó để ẩn
    // thanh tab khi mở bàn phím (Android), style mình truyền vào sẽ đè mất.
    // Trượt thêm 24 cho khuất cả bóng đổ của viên.
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.autoHideLayer,
        {
          height: overlap,
          transform: [
            {
              translateY: autoHideProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, overlap + 24],
              }),
            },
          ],
        },
      ]}
    >
      <TabBarInvertedProvider value={usesInvertedStyle}>
        <BottomTabBar key={colorScheme} {...props} descriptors={descriptors} />
      </TabBarInvertedProvider>
    </Animated.View>
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

/** Số đỏ trên tab Lịch như Facebook: việc cần xử lý, cùng số với ô Workflow. */
const useLichTabBadge = () => ({
  badgeCount: useHomeMenuContext().workflowTileCount,
});

const LichTabButton = createTabBarButton(
  {
    label: "Lịch",
    icon: "calendar",
    iconOutline: "calendar-outline",
  },
  useLichTabBadge,
);

/** Ảnh đại diện thay bánh răng, như tab Menu của Facebook; chưa có ảnh thì giữ bánh răng. */
const useSettingTabAvatar = () => ({
  avatarUrl:
    useAppSelector((state) => state.nhanVien.info?.hinhAnh) ?? undefined,
});

const SettingTabButton = createTabBarButton(
  {
    label: "Cài đặt",
    icon: "settings",
    iconOutline: "settings-outline",
  },
  useSettingTabAvatar,
);

export default function Tabs() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const tabBorderColor = useStrongBorderColor();
  const colorScheme = useColorScheme();
  const { canView, loaded: permissionsLoaded } = usePermission();
  /* Có quyền xem view Workflow thì ô Camera đổi thành Lịch công việc.
     Quyền nạp SAU khi khung điều hướng đã dựng: trong lúc chờ giữ Camera như
     cũ, nên user có view Workflow thấy Camera → Lịch đổi một lần lúc mở app.
     Luôn 5 ô để nút Quét nằm đúng giữa. */
  const showLichTab = permissionsLoaded && canView(WORKFLOW_VIEW_CODE);

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
      <TabBarAutoHideProvider>
        <View style={styles.root}>
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
              options={{
                title: "Quét QR",
                tabBarButton: ScanTabButton,
                // Màu nền thật do ThemeAwareTabBar quyết định; đây chỉ là cờ báo
                // màn quét muốn thanh tab nền tối. Tab này chỉ có màn quét.
                tabBarBackground: INVERTED_TAB_BAR_MARKER,
              }}
            />

            {showLichTab ? (
              <Tab.Screen
                name="LichTab"
                component={LichStack}
                // Không nạp lịch lúc mở app — chỉ khi người dùng vào tab.
                options={{ title: "Lịch", tabBarButton: LichTabButton, lazy: true }}
              />
            ) : (
              <Tab.Screen
                name="CameraTab"
                component={CameraStack}
                options={{ title: "Camera", tabBarButton: CameraTabButton }}
              />
            )}

            <Tab.Screen
              name="SettingTab"
              component={SettingStack}
              options={{
                title: "Cài đặt",
                tabBarButton: SettingTabButton,
              }}
            />
          </Tab.Navigator>
          {/* Bảng chuông (nút ở HeaderHome) phủ cả thanh tab nhưng nằm DƯỚI các màn
              của stack gốc: mở chi tiết từ bảng rồi back là thấy lại bảng ngay. */}
          <ThongBaoBellPanel />
        </View>
      </TabBarAutoHideProvider>
    </HomeMenuProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Phủ đúng dải đáy màn mà viên thanh tab chiếm; viên vẫn tự đặt vị trí trong
  // lớp này bằng `createTabBarStyle` (tuyệt đối, cách đáy và hai mép).
  autoHideLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
