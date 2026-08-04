import type { Item, ViewActiveItem } from "../../../types";

export const FALLBACK_ICON_NAME = "apps-outline";

const VEHICLE_JOURNEY_MOBILE_VIEW = "VehicleJourney";
const VEHICLE_TRACKING_MOBILE_VIEW = "VehicleTracking";
const VEHICLE_CURRENT_LOCATION_MOBILE_VIEW = "VehicleCurrentLocation";

export const VEHICLE_JOURNEY_FEATURE_ID = "hanh-trinh-phuong-tien-mobile";
export const VEHICLE_TRACKING_FEATURE_ID = "tracking-phuong-tien-mobile";
export const VEHICLE_CURRENT_LOCATION_FEATURE_ID =
  "vi-tri-hien-tai-phuong-tien-mobile";

export const STATIC_VIEW_ORDER_NUMBERS = new Set([3, 4]);

const LEGACY_PINNED_FEATURE_ID_MAP: Record<string, string> = {
  "1": "2",
  "2": "5",
  "3": "6",
  "4": "3",
  "5": "4",
};

// Chỉ 4 ô cho hàng shortcut một dòng trên Trang chủ. Các chức năng phương tiện
// vẫn có đủ trong tab Chức năng và user tự ghim thêm nếu muốn.
// Đổi hằng số này chỉ ảnh hưởng user chưa từng ghim; ai đã ghim thì đọc từ
// AsyncStorage.
export const DEFAULT_HOME_FEATURE_IDS = ["2", "5", "6", "3"];

export const normalizeHomeFeatureId = (id: string) =>
  LEGACY_PINNED_FEATURE_ID_MAP[id] ?? id;

// Báo cáo được sinh ra từ chính chức năng (spread lại item), nên nếu không đặt
// tiền tố thì "Nội địa" tồn tại hai lần với cùng một id: một lần mở Asset, một
// lần mở Report. Ghim báo cáo sẽ làm sáng luôn card chức năng và Trang chủ hiện
// sai loại. Tiền tố cho phép dùng MỘT danh sách ghim duy nhất — user xen kẽ được
// chức năng và báo cáo theo đúng thứ tự mình muốn.
const REPORT_FEATURE_ID_PREFIX = "report:";

export const toReportFeatureId = (id: string) =>
  `${REPORT_FEATURE_ID_PREFIX}${id}`;

export const isReportFeatureId = (id: string) =>
  id.startsWith(REPORT_FEATURE_ID_PREFIX);

type ReportSourceItem = {
  groupMenuId?: number;
  id: string;
  label: string;
  viewPermission?: string;
};

/**
 * Mỗi chức năng có `groupMenuId` đều kèm một báo cáo tương ứng.
 *
 * Dùng chung cho tab Chức năng (hiện danh sách báo cáo) và Trang chủ (giải id
 * `report:` đã ghim về lại đúng hành vi mở báo cáo).
 */
export const createReportActions = <T extends ReportSourceItem>(
  items: T[],
  openReportScreen: (params: {
    groupMenuId?: number;
    titleHeader?: string;
    viewPermission?: string;
  }) => void,
) =>
  items
    .filter((item) => typeof item.groupMenuId === "number")
    .map((item) => ({
      ...item,
      id: toReportFeatureId(item.id),
      homeGroup: "report" as const,
      iconName: "document-text-outline",
      onPress: () =>
        openReportScreen({
          groupMenuId: item.groupMenuId,
          titleHeader: item.label,
          viewPermission: item.viewPermission,
        }),
    }));

const IMAGE_ICON_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i;

export const getViewIconName = (item: ViewActiveItem) => {
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

export const getViewOrderNumber = (item: ViewActiveItem) =>
  Number(item.stt ?? item.id);

export const getViewMenuItemId = (item: ViewActiveItem) =>
  String(getViewOrderNumber(item));

const isEnabledFlag = (value: Item["isViewWeb"]) =>
  value === true || value === 1 || value === "1" || value === "true";

const matchesGroupTwoMobileView = (item: Item, mobileView: string) =>
  Number(item.iD_GroupMenu) === 2 &&
  isEnabledFlag(item.isViewWeb) &&
  item.viewWebMobile?.trim() === mobileView;

export const isVehicleJourneyMobileView = (item: Item) =>
  matchesGroupTwoMobileView(item, VEHICLE_JOURNEY_MOBILE_VIEW);

export const isVehicleTrackingMobileView = (item: Item) =>
  matchesGroupTwoMobileView(item, VEHICLE_TRACKING_MOBILE_VIEW);

export const isVehicleCurrentLocationMobileView = (item: Item) =>
  matchesGroupTwoMobileView(item, VEHICLE_CURRENT_LOCATION_MOBILE_VIEW);
