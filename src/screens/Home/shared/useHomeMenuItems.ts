import { useCallback, useMemo } from "react";
import type {
  HomeNavigationProp,
  Item,
  MenuItemComponent,
  ViewActiveItem,
} from "../../../types";
import { HOME_MEETING_INFO } from "./homeData";
import { WORKFLOW_VIEW_CODE } from "../../Workflow/workflowMenu";
import { useHomeMenuContext } from "./HomeMenuProvider";
import {
  VEHICLE_CURRENT_LOCATION_FEATURE_ID,
  VEHICLE_JOURNEY_FEATURE_ID,
  VEHICLE_TRACKING_FEATURE_ID,
  getViewIconName,
  getViewMenuItemId,
  getViewOrderNumber,
  isGroupWebView,
  normalizeViewCode,
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

/**
 * View viết riêng trên app (không dùng màn Asset mặc định).
 *
 * Vị trí lấy theo `stt` của group isGroupWeb có Mã (`ma`) trùng
 * `viewPermission` — với group mặc định hai giá trị này vốn là một. Không có
 * group nào khớp thì nằm ở `fallbackOrder` (đúng chỗ cũ trước khi BE có
 * isGroupWeb).
 * `id` cố định thì dùng luôn — Điện mặt trời đã được ghim bằng id chữ; không
 * đặt thì theo stt của group như các ô mặc định, để ghim cũ của Camera/ĐHCĐ
 * ("3"/"4") vẫn còn.
 */
type CustomMenuView = Omit<HomeMenuItem, "id"> & {
  fallbackOrder: number;
  id?: string;
};

type OrderedMenuItem = { item: HomeMenuItem; order: number };

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

  const openWorkflowScreen = useCallback(
    () => navigation.navigate("Workflow"),
    [navigation],
  );

  const openSettingScreen = useCallback(
    () => tabsNavigation?.navigate("SettingTab"),
    [tabsNavigation],
  );

  const customMenuViews = useMemo<CustomMenuView[]>(
    () => [
      {
        id: "solar-dashboard",
        label: "Điện mặt trời",
        iconName: "sunny-outline",
        viewPermission: "Solar_Dashboard",
        description: "Giám sát sản lượng và tiêu thụ",
        fallbackOrder: 0,
        onPress: openSolarPlantScreen,
      },
      {
        label: "Camera",
        iconName: "camera-outline",
        viewPermission: "Camera",
        description: "Giám sát hệ thống",
        fallbackOrder: 3,
        onPress: openCameraScreen,
      },
      {
        label: "Đại hội cổ đông",
        iconName: "people-outline",
        viewPermission: "DHCD",
        description: "Quản lý cổ đông",
        fallbackOrder: 4,
        onPress: openMeetingScreen,
      },
      {
        // Id chữ cố định như Điện mặt trời: ghim không trôi theo stt của group.
        id: "workflow",
        label: "Workflow",
        iconName: "git-network-outline",
        viewPermission: WORKFLOW_VIEW_CODE,
        description: "Phiếu đề nghị, công việc, kế hoạch",
        // Chưa có group isGroupWeb Mã "Workflow" thì đứng cuối danh sách.
        fallbackOrder: 999,
        onPress: openWorkflowScreen,
      },
    ],
    [openCameraScreen, openMeetingScreen, openSolarPlantScreen, openWorkflowScreen],
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

  // Group isGroupWeb không có màn mặc định nên không tự thành ô; chỉ cho view
  // viết riêng mượn stt. Ô xếp chung một trục stt, trùng stt thì view viết
  // riêng đứng trước (sort ổn định, view riêng được đưa vào mảng trước).
  const featureMenuItems = useMemo<HomeMenuItem[]>(() => {
    const groupWebViews = apiViews.filter(isGroupWebView);

    const customItems = customMenuViews.map<OrderedMenuItem>(
      ({ fallbackOrder, id, ...view }) => {
        const code = normalizeViewCode(view.viewPermission);
        const group = code
          ? groupWebViews.find((item) => normalizeViewCode(item.ma) === code)
          : undefined;

        return {
          item: {
            ...view,
            id: id ?? (group ? getViewMenuItemId(group) : String(fallbackOrder)),
          },
          order: group ? getViewOrderNumber(group) : fallbackOrder,
        };
      },
    );
    const defaultItems = apiViews
      .filter((view) => !isGroupWebView(view))
      .map<OrderedMenuItem>((view) => ({
        item: createApiMenuItem(view),
        order: getViewOrderNumber(view),
      }));

    return [...customItems, ...defaultItems]
      .sort((a, b) => a.order - b.order)
      .map(({ item }) => item);
  }, [apiViews, createApiMenuItem, customMenuViews]);

  const menuItems = useMemo<HomeMenuItem[]>(
    () => [
      ...featureMenuItems,
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
      createVehicleJourneyMenuItem,
      createVehicleTrackingMenuItem,
      createVehicleCurrentLocationMenuItem,
      featureMenuItems,
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
