import { useCallback, useMemo } from "react";
import type { HomeNavigationProp, MenuItemComponent } from "../../../types";
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
  const openMeetingScreen = useCallback(
    () => navigation.navigate("ShareholdersMeeting", HOME_MEETING_INFO),
    [navigation],
  );

  const openCameraScreen = useCallback(
    () => navigation.navigate("Camera"),
    [navigation],
  );

  const openScanScreen = useCallback(
    () => tabsNavigation?.navigate("ScanTab", { screen: "Scan" }),
    [tabsNavigation],
  );

  const openReportScreen = useCallback(
    () => navigation.navigate("Report"),
    [navigation],
  );

  const openSettingScreen = useCallback(
    () => tabsNavigation?.navigate("SettingTab"),
    [tabsNavigation],
  );

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
        id: "2",
        label: "Nội địa",
        iconName: "business-outline",
        viewPermission: "NoiDia",
        description: "Quản lý nội địa",
        onPress: () =>
          navigation.navigate("Asset", {
            groupMenuId: 5,
            titleHeader: "Nội địa",
            viewPermission: "NoiDia",
          }),
      },
      {
        id: "3",
        label: "BHLĐ-PCCC",
        iconName: "shield-checkmark-outline",
        viewPermission: "BHLD",
        description: "Quản lý bảo hộ lao động",
        onPress: () =>
          navigation.navigate("Asset", {
            groupMenuId: 6,
            titleHeader: "Bảo hộ lao động",
            viewPermission: "BHLD",
          }),
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
    [navigation, openCameraScreen, openMeetingScreen],
  );

  return {
    menuItems,
    openMeetingScreen,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
  };
}
