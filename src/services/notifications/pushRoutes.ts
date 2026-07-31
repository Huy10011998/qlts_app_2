import { navigateFromRef } from "../../navigation/navigationService";
import { log, warn } from "../../utils/Logger";

/**
 * Whitelist các route mà BE được phép yêu cầu app mở qua `data.route`.
 *
 * Cố tình dùng whitelist thay vì navigate thẳng tên route từ payload:
 * - route sai chính tả từ BE sẽ chỉ mở app thay vì làm crash navigation;
 * - route nằm trong stack lồng nhau cần đường dẫn khác nhau (xem `container`),
 *   không thể navigate phẳng theo tên.
 *
 * Muốn thêm route mới thì thêm một dòng ở đây — không cần sửa chỗ khác.
 */
type PushRouteContainer = "root" | "homeTab" | "settingTab";

const PUSH_ROUTES: Record<string, PushRouteContainer> = {
  // Màn hình nằm trực tiếp trên RootStack (AppNavigator)
  CameraPlayback: "root",
  VehicleJourneyMap: "root",
  VehicleTrackingMap: "root",
  VehicleCurrentLocation: "root",

  // Màn hình trong HomeStack (Tabs → HomeTab)
  Home: "homeTab",
  Asset: "homeTab",
  AssetList: "homeTab",
  AssetDetails: "homeTab",
  AssetRelatedList: "homeTab",
  AssetRelatedDetails: "homeTab",
  AssetHistoryDetail: "homeTab",
  Report: "homeTab",
  Camera: "homeTab",
  CameraList: "homeTab",
  CameraListGrid: "homeTab",
  VehicleJourney: "homeTab",
  VehicleTracking: "homeTab",
  SolarPlant: "homeTab",
  ShareholdersMeeting: "homeTab",

  // Màn hình trong SettingStack (Tabs → SettingTab)
  Setting: "settingTab",
  Profile: "settingTab",
  Appearance: "settingTab",
};

const TAB_BY_CONTAINER: Record<
  Exclude<PushRouteContainer, "root">,
  "HomeTab" | "SettingTab"
> = {
  homeTab: "HomeTab",
  settingTab: "SettingTab",
};

/** true nếu BE gửi một route app biết cách mở. */
export const isKnownPushRoute = (route?: string): boolean =>
  Boolean(route && route in PUSH_ROUTES);

/**
 * Mở màn hình tương ứng với route BE gửi.
 *
 * @returns false khi route không hợp lệ hoặc navigation chưa sẵn sàng — caller
 * quyết định bỏ qua (route lạ) hay thử lại sau (chưa sẵn sàng).
 */
export const navigateToPushRoute = (
  route: string,
  params?: Record<string, unknown>,
): boolean => {
  const container = PUSH_ROUTES[route];

  if (!container) {
    warn("[Push] Route không nằm trong whitelist → chỉ mở app", { route });
    return false;
  }

  log("[Push] Điều hướng theo thông báo", { route, container, params });

  if (container === "root") {
    return navigateFromRef(route, params);
  }

  // Stack lồng nhau: Tabs → <Tab> → <Screen>
  return navigateFromRef("Tabs", {
    screen: TAB_BY_CONTAINER[container],
    params: { screen: route, params },
  });
};
