import { useCallback, useMemo } from "react";
import type {
  HomeNavigationProp,
  Item,
  MenuItemComponent,
  ViewActiveItem,
} from "../../../types";
import { HOME_MEETING_INFO } from "./homeData";
import { useHomeMenuContext } from "./HomeMenuProvider";
import {
  STATIC_VIEW_ORDER_NUMBERS,
  VEHICLE_CURRENT_LOCATION_FEATURE_ID,
  VEHICLE_JOURNEY_FEATURE_ID,
  VEHICLE_TRACKING_FEATURE_ID,
  getViewIconName,
  getViewMenuItemId,
  getViewOrderNumber,
} from "./homeMenuHelpers";

export { DEFAULT_HOME_FEATURE_IDS, normalizeHomeFeatureId } from "./homeMenuHelpers";

export interface HomeMenuItem extends MenuItemComponent {
  description?: string;
  groupMenuId?: number;
  homeGroup?: "vehicle" | "report";
  iconName: string;
  id: string;
  viewPermission?: string;
}

type ParentNavigation = {
  navigate: (screen: string, params?: any) => void;
};

/**
 * Dựng danh sách chức năng đã gắn sẵn hành vi điều hướng.
 *
 * Dữ liệu thô (GET_VIEW_ACTIVE / GET_MENU_ACTIVE) nằm ở `HomeMenuProvider` vì cả
 * Trang chủ lẫn tab Chức năng đều cần. Hook này chỉ lo phần không chia sẻ được:
 * `onPress` phải bind vào đúng navigator của màn đang gọi, để chức năng mở ra
 * trong stack của tab đó chứ không nhảy tab.
 */
export function useHomeMenuItems(
  navigation: HomeNavigationProp,
  tabsNavigation?: ParentNavigation | null,
) {
  const {
    apiViews,
    fetchHomeMenuItems,
    hasLoadedMenuOnce,
    hasMenuLoadError,
    isMenuLoading,
    isPinnedFeatureIdsLoading,
    pinnedFeatureIds,
    togglePinnedFeature,
    vehicleCurrentLocationMenuItem,
    vehicleJourneyMenuItem,
    vehicleTrackingMenuItem,
  } = useHomeMenuContext();

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

  const openFeatureTab = useCallback(
    () => tabsNavigation?.navigate("FeatureTab"),
    [tabsNavigation],
  );

  const openReportScreen = useCallback(
    (params?: {
      groupMenuId?: number;
      titleHeader?: string;
      viewPermission?: string;
    }) => navigation.navigate("Report", params),
    [navigation],
  );

  const openSolarPlantScreen = useCallback(
    () => navigation.navigate("SolarPlant"),
    [navigation],
  );

  const openSettingScreen = useCallback(
    () => tabsNavigation?.navigate("SettingTab"),
    [tabsNavigation],
  );

  const createStaticMenuItem = useCallback(
    (view: ViewActiveItem): HomeMenuItem => {
      if (getViewOrderNumber(view) === 3) {
        return {
          id: getViewMenuItemId(view),
          label: "Camera",
          iconName: "camera-outline",
          viewPermission: "Camera",
          description: "Giám sát hệ thống",
          onPress: openCameraScreen,
        };
      }

      return {
        id: getViewMenuItemId(view),
        label: "Đại hội cổ đông",
        iconName: "people-outline",
        viewPermission: "DHCD",
        description: "Quản lý cổ đông",
        onPress: openMeetingScreen,
      };
    },
    [openCameraScreen, openMeetingScreen],
  );

  const createApiMenuItem = useCallback(
    (view: ViewActiveItem): HomeMenuItem => {
      const viewPermission = view.ma;
      const groupMenuId = view.id;
      const titleHeader = view.label;

      return {
        id: getViewMenuItemId(view),
        label: view.label,
        groupMenuId,
        iconName: getViewIconName(view),
        viewPermission,
        description: view.longLabel ?? undefined,
        onPress: () =>
          navigation.navigate("Asset", {
            groupMenuId,
            titleHeader,
            viewPermission,
          }),
      };
    },
    [navigation],
  );

  const createVehicleJourneyMenuItem = useCallback(
    (item: Item): HomeMenuItem => {
      const assetView = apiViews.find((view) => view.id === 2);

      return {
        id: VEHICLE_JOURNEY_FEATURE_ID,
        label: item.label || "Hành trình phương tiện",
        groupMenuId: 2,
        homeGroup: "vehicle",
        iconName: "navigate-circle-outline",
        viewPermission: assetView?.ma,
        description: "Theo dõi hành trình phương tiện",
        onPress: () => navigation.navigate("VehicleJourney"),
      };
    },
    [apiViews, navigation],
  );

  const createVehicleTrackingMenuItem = useCallback(
    (item: Item): HomeMenuItem => {
      const assetView = apiViews.find((view) => view.id === 2);
      return {
        id: VEHICLE_TRACKING_FEATURE_ID,
        label: item.label || "Dừng đỗ phương tiện",
        groupMenuId: 2,
        homeGroup: "vehicle",
        iconName: "location-outline",
        viewPermission: assetView?.ma,
        description: "Theo dõi các điểm dừng đỗ",
        onPress: () => navigation.navigate("VehicleTracking"),
      };
    },
    [apiViews, navigation],
  );

  const createVehicleCurrentLocationMenuItem = useCallback(
    (item: Item): HomeMenuItem => {
      const assetView = apiViews.find((view) => view.id === 2);
      return {
        id: VEHICLE_CURRENT_LOCATION_FEATURE_ID,
        label: item.label || "Vị trí hiện tại",
        groupMenuId: 2,
        homeGroup: "vehicle",
        iconName: "navigate-outline",
        viewPermission: assetView?.ma,
        description: "Theo dõi vị trí hiện tại phương tiện",
        onPress: () => navigation.navigate("VehicleCurrentLocation"),
      };
    },
    [apiViews, navigation],
  );

  const menuItems = useMemo<HomeMenuItem[]>(
    () => [
      {
        id: "solar-dashboard",
        label: "Điện mặt trời",
        iconName: "sunny-outline",
        viewPermission: "Solar_Dashboard",
        description: "Giám sát sản lượng và tiêu thụ",
        onPress: openSolarPlantScreen,
      },
      ...apiViews.map((view) =>
        STATIC_VIEW_ORDER_NUMBERS.has(getViewOrderNumber(view))
          ? createStaticMenuItem(view)
          : createApiMenuItem(view),
      ),
      ...(vehicleJourneyMenuItem
        ? [createVehicleJourneyMenuItem(vehicleJourneyMenuItem)]
        : []),
      ...(vehicleTrackingMenuItem
        ? [createVehicleTrackingMenuItem(vehicleTrackingMenuItem)]
        : []),
      ...(vehicleCurrentLocationMenuItem
        ? [
            createVehicleCurrentLocationMenuItem(
              vehicleCurrentLocationMenuItem,
            ),
          ]
        : []),
    ],
    [
      apiViews,
      createApiMenuItem,
      createStaticMenuItem,
      createVehicleJourneyMenuItem,
      createVehicleTrackingMenuItem,
      createVehicleCurrentLocationMenuItem,
      openSolarPlantScreen,
      vehicleJourneyMenuItem,
      vehicleTrackingMenuItem,
      vehicleCurrentLocationMenuItem,
    ],
  );

  return {
    menuItems,
    fetchHomeMenuItems,
    hasLoadedMenuOnce,
    hasMenuLoadError,
    isMenuLoading,
    isPinnedFeatureIdsLoading,
    openFeatureTab,
    openMeetingScreen,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
    pinnedFeatureIds,
    togglePinnedFeature,
  };
}
