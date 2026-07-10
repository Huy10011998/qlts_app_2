import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "../../../config";
import { callApi } from "../../../services/data/callApi";
import type {
  GetViewActiveResponse,
  HomeNavigationProp,
  Item,
  MenuItemComponent,
  ViewActiveItem,
} from "../../../types";
import { HOME_MEETING_INFO } from "./homeData";
import { error, log } from "../../../utils/Logger";
import { HIDDEN_TAB_BAR_STYLE } from "../../../navigation/shared/tabBarTheme";

export interface HomeMenuItem extends MenuItemComponent {
  description?: string;
  groupMenuId?: number;
  homeGroup?: "vehicle";
  iconName: string;
  id: string;
  viewPermission?: string;
}

type ParentNavigation = {
  navigate: (screen: string, params?: any) => void;
  setOptions?: (options: Record<string, unknown>) => void;
};

const FALLBACK_ICON_NAME = "apps-outline";
const VEHICLE_JOURNEY_MOBILE_VIEW = "VehicleJourney";
const VEHICLE_JOURNEY_FEATURE_ID = "hanh-trinh-phuong-tien-mobile";
const VEHICLE_TRACKING_MOBILE_VIEW = "VehicleTracking";
const VEHICLE_TRACKING_FEATURE_ID = "tracking-phuong-tien-mobile";
const VEHICLE_CURRENT_LOCATION_MOBILE_VIEW = "VehicleCurrentLocation";
const VEHICLE_CURRENT_LOCATION_FEATURE_ID =
  "vi-tri-hien-tai-phuong-tien-mobile";

const STATIC_VIEW_ORDER_NUMBERS = new Set([3, 4]);

const LEGACY_PINNED_FEATURE_ID_MAP: Record<string, string> = {
  "1": "2",
  "2": "5",
  "3": "6",
  "4": "3",
  "5": "4",
};

export const DEFAULT_HOME_FEATURE_IDS = [
  "2",
  "5",
  "6",
  "3",
  VEHICLE_JOURNEY_FEATURE_ID,
  VEHICLE_TRACKING_FEATURE_ID,
  VEHICLE_CURRENT_LOCATION_FEATURE_ID,
];

export const normalizeHomeFeatureId = (id: string) =>
  LEGACY_PINNED_FEATURE_ID_MAP[id] ?? id;

const IMAGE_ICON_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i;

const getViewIconName = (item: ViewActiveItem) => {
  const iconName = item.iconMobile?.trim();

  if (
    !iconName ||
    iconName.includes("/") ||
    /^https?:\/\//i.test(iconName) ||
    IMAGE_ICON_PATTERN.test(iconName)
  ) {
    return FALLBACK_ICON_NAME;
  }

  return iconName;
};

const getViewOrderNumber = (item: ViewActiveItem) =>
  Number(item.stt ?? item.id);

const getViewMenuItemId = (item: ViewActiveItem) =>
  String(getViewOrderNumber(item));

const isEnabledFlag = (value: Item["isViewWeb"]) =>
  value === true || value === 1 || value === "1" || value === "true";

const hasVehicleJourneyMobileView = (item: Item) =>
  Number(item.iD_GroupMenu) === 2 &&
  isEnabledFlag(item.isViewWeb) &&
  item.viewWebMobile?.trim() === VEHICLE_JOURNEY_MOBILE_VIEW;

const hasVehicleTrackingMobileView = (item: Item) =>
  Number(item.iD_GroupMenu) === 2 &&
  isEnabledFlag(item.isViewWeb) &&
  item.viewWebMobile?.trim() === VEHICLE_TRACKING_MOBILE_VIEW;

const hasVehicleCurrentLocationMobileView = (item: Item) =>
  Number(item.iD_GroupMenu) === 2 &&
  isEnabledFlag(item.isViewWeb) &&
  item.viewWebMobile?.trim() === VEHICLE_CURRENT_LOCATION_MOBILE_VIEW;

export function useHomeMenuItems(
  navigation: HomeNavigationProp,
  tabsNavigation?: ParentNavigation | null,
) {
  const [apiViews, setApiViews] = useState<ViewActiveItem[]>([]);
  const [vehicleJourneyMenuItem, setVehicleJourneyMenuItem] =
    useState<Item | null>(null);
  const [vehicleTrackingMenuItem, setVehicleTrackingMenuItem] =
    useState<Item | null>(null);
  const [vehicleCurrentLocationMenuItem, setVehicleCurrentLocationMenuItem] =
    useState<Item | null>(null);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [hasMenuLoadError, setHasMenuLoadError] = useState(false);
  const fetchingRef = useRef(false);

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

  const fetchHomeMenuItems = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setIsMenuLoading(true);

    try {
      const [response, menuResponse] = (await Promise.all([
        callApi("POST", API_ENDPOINTS.GET_VIEW_ACTIVE, {}),
        callApi("POST", API_ENDPOINTS.GET_MENU_ACTIVE, {}),
      ])) as [GetViewActiveResponse, { data?: Item[] }];

      if (!Array.isArray(response?.data)) throw new Error("Invalid data");

      setApiViews(
        response.data
          .filter(
            (item) => getViewOrderNumber(item) !== 1 && item.isActive !== false,
          )
          .sort((a, b) => getViewOrderNumber(a) - getViewOrderNumber(b)),
      );
      const groupTwoMenuItems = Array.isArray(menuResponse?.data)
        ? menuResponse.data.filter((item) => Number(item.iD_GroupMenu) === 2)
        : [];
      const vehicleJourneyItem =
        groupTwoMenuItems.find(hasVehicleJourneyMobileView) ?? null;
      const vehicleTrackingItem =
        groupTwoMenuItems.find(hasVehicleTrackingMobileView) ?? null;
      const vehicleCurrentLocationItem =
        groupTwoMenuItems.find(hasVehicleCurrentLocationMobileView) ?? null;

      log("[HomeMenu] GET_MENU_ACTIVE itemGroup = 2", groupTwoMenuItems);
      log(
        "[HomeMenu] VehicleJourney matched item",
        vehicleJourneyItem,
      );
      log(
        "[HomeMenu] VehicleTracking matched item",
        vehicleTrackingItem,
      );
      log(
        "[HomeMenu] VehicleCurrentLocation matched item",
        vehicleCurrentLocationItem,
      );

      setVehicleJourneyMenuItem(vehicleJourneyItem);
      setVehicleTrackingMenuItem(vehicleTrackingItem);
      setVehicleCurrentLocationMenuItem(vehicleCurrentLocationItem);
      setHasMenuLoadError(false);
    } catch (e) {
      error("GET_VIEW_ACTIVE error:", e);
      setHasMenuLoadError(true);
    } finally {
      fetchingRef.current = false;
      setIsMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeMenuItems();
  }, [fetchHomeMenuItems]);

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
        onPress: () => {
          tabsNavigation?.setOptions?.({
            tabBarStyle: HIDDEN_TAB_BAR_STYLE,
          });
          requestAnimationFrame(() => {
            navigation.navigate("VehicleCurrentLocation");
          });
        },
      };
    },
    [apiViews, navigation, tabsNavigation],
  );

  const menuItems = useMemo<HomeMenuItem[]>(
    () => [
      {
        id: "solar-plant-demo",
        label: "Cholimex Solar Plant",
        iconName: "sunny-outline",
        viewPermission: "SOLAR_PLANT",
        description: "Giám sát năng lượng",
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
    hasMenuLoadError,
    isMenuLoading,
    openMeetingScreen,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
  };
}
