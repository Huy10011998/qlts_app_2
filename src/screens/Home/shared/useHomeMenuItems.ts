import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "../../../config";
import { callApi } from "../../../services/data/callApi";
import type {
  GetViewActiveResponse,
  HomeNavigationProp,
  MenuItemComponent,
  ViewActiveItem,
} from "../../../types";
import { HOME_MEETING_INFO } from "./homeData";
import { error } from "../../../utils/Logger";

export interface HomeMenuItem extends MenuItemComponent {
  description?: string;
  groupMenuId?: number;
  iconName: string;
  id: string;
  viewPermission?: string;
}

type ParentNavigation = {
  navigate: (screen: string, params?: any) => void;
};

const FALLBACK_ICON_NAME = "apps-outline";

const STATIC_VIEW_ORDER_NUMBERS = new Set([3, 4]);

const LEGACY_PINNED_FEATURE_ID_MAP: Record<string, string> = {
  "1": "2",
  "2": "5",
  "3": "6",
  "4": "3",
  "5": "4",
};

export const DEFAULT_HOME_FEATURE_IDS = ["2", "5", "6", "3"];

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

export function useHomeMenuItems(
  navigation: HomeNavigationProp,
  tabsNavigation?: ParentNavigation | null,
) {
  const [apiViews, setApiViews] = useState<ViewActiveItem[]>([]);
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
      const response = (await callApi(
        "POST",
        API_ENDPOINTS.GET_VIEW_ACTIVE,
        {},
      )) as GetViewActiveResponse;

      if (!Array.isArray(response?.data)) throw new Error("Invalid data");

      setApiViews(
        response.data
          .filter(
            (item) => getViewOrderNumber(item) !== 1 && item.isActive !== false,
          )
          .sort((a, b) => getViewOrderNumber(a) - getViewOrderNumber(b)),
      );
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
    ],
    [apiViews, createApiMenuItem, createStaticMenuItem, openSolarPlantScreen],
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
