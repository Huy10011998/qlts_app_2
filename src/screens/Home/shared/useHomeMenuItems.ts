import { useMemo } from "react";
import { HomeNavigationProp, MenuItemComponent } from "../../../types";
import { HOME_MEETING_INFO } from "./homeData";

export interface HomeMenuItem extends MenuItemComponent {
  description?: string;
  iconName: string;
  id: string;
  viewPermission?: string;
}

type ParentNavigation = {
  navigate: (screen: string, params?: any) => void;
};

export function useHomeMenuItems(
  navigation: HomeNavigationProp,
  tabsNavigation?: ParentNavigation | null,
) {
  const openMeetingScreen = () =>
    navigation.navigate("ShareholdersMeeting", HOME_MEETING_INFO);

  const openCameraScreen = () => navigation.navigate("Camera");

  const openScanScreen = () =>
    tabsNavigation?.navigate("ScanTab", { screen: "Scan" });

  const openSettingScreen = () => tabsNavigation?.navigate("SettingTab");

  const menuItems = useMemo<HomeMenuItem[]>(
    () => [
      {
        id: "1",
        label: "Tài sản",
        iconName: "cube-outline",
        viewPermission: "TaiSan",
        description: "Quản lý tài sản",
        onPress: () => navigation.navigate("Asset"),
      },
      {
        id: "4",
        label: "Camera",
        iconName: "camera-outline",
        viewPermission: "Camera",
        description: "Giám sát hệ thống",
        onPress: openCameraScreen,
      },
      {
        id: "5",
        label: "Đại hội cổ đông",
        iconName: "people-outline",
        viewPermission: "DHCD",
        description: "Quản lý cổ đông",
        onPress: openMeetingScreen,
      },
    ],
    [navigation, tabsNavigation],
  );

  return {
    menuItems,
    openMeetingScreen,
    openScanScreen,
    openSettingScreen,
  };
}
