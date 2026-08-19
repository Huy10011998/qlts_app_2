import { CommonActions, StackActions } from "@react-navigation/native";
import type { RootStackParamList } from "../../types";

type AssetRouteContext = {
  groupMenuId?: number;
  viewPermission?: string;
  assetTitleHeader?: string;
};

type ResetNavigation = {
  dispatch?: (action: any) => void;
  getState?: () => {
    index: number;
    routes: Array<{
      key?: string;
      name: keyof RootStackParamList | string;
      params?: Record<string, any>;
    }>;
  };
  reset: (state: {
    index: number;
    routes: Array<{
      name: keyof RootStackParamList;
      params?: Record<string, any>;
    }>;
  }) => void;
};

const buildAssetParams = ({
  groupMenuId,
  viewPermission,
  assetTitleHeader,
}: AssetRouteContext) => ({
  ...(typeof groupMenuId === "number" ? { groupMenuId } : {}),
  ...(viewPermission ? { viewPermission } : {}),
  ...(assetTitleHeader ? { titleHeader: assetTitleHeader } : {}),
});

const matchesParams = (
  currentParams: Record<string, any> | undefined,
  expectedParams: Record<string, any>,
) =>
  Object.entries(expectedParams).every(
    ([key, value]) => value === undefined || currentParams?.[key] === value,
  );

/**
 * `routeName`: một tên, hoặc nhiều tên khi cùng một bản ghi có thể đang mở ở
 * nhiều màn khác nhau — pop về cái gần nhất trong số đó.
 *
 * `paramsForTarget`: params ghi vào chính route được pop về, trước khi pop. Cần
 * `source` là key của route đó — `setParams` không có `source` sẽ áp vào màn đang
 * đứng (màn sắp bị pop), tức là mất tác dụng.
 */
function popToExistingRoute(
  navigation: ResetNavigation,
  routeName: keyof RootStackParamList | Array<keyof RootStackParamList>,
  expectedParams: Record<string, any>,
  paramsForTarget?: Record<string, any>,
) {
  const state = navigation.getState?.();
  if (!state || typeof state.index !== "number" || !navigation.dispatch) {
    return false;
  }

  const routeNames = Array.isArray(routeName) ? routeName : [routeName];
  const target = state.routes
    .slice(0, state.index)
    .map((route, index) => ({ route, index }))
    .reverse()
    .find(
      ({ route }) =>
        routeNames.includes(route.name as keyof RootStackParamList) &&
        matchesParams(route.params, expectedParams),
    );

  if (target === undefined) return false;

  const popCount = state.index - target.index;
  if (popCount <= 0) return false;

  if (paramsForTarget && target.route.key) {
    navigation.dispatch({
      ...CommonActions.setParams(paramsForTarget),
      source: target.route.key,
    });
  }

  navigation.dispatch(StackActions.pop(popCount));
  return true;
}

export function resetToAssetList(
  navigation: ResetNavigation,
  {
    assetContext,
    listParams,
  }: {
    assetContext: AssetRouteContext;
    listParams: RootStackParamList["AssetList"];
  },
) {
  navigation.reset({
    index: 2,
    routes: [
      { name: "Home" },
      { name: "Asset", params: buildAssetParams(assetContext) },
      { name: "AssetList", params: listParams },
    ],
  });
}

export function backToAssetList(
  navigation: ResetNavigation,
  {
    assetContext,
    listParams,
  }: {
    assetContext: AssetRouteContext;
    listParams: RootStackParamList["AssetList"];
  },
) {
  const didPop = popToExistingRoute(navigation, "AssetList", {
    nameClass: listParams.nameClass,
  });

  if (!didPop) {
    resetToAssetList(navigation, { assetContext, listParams });
  }
}

/**
 * Hai màn chi tiết có tab "Chi tiết" để mở được danh sách con, tức là hai màn có
 * thể là cha của một `AssetRelatedList`: vào từ danh sách tài sản (`AssetDetails`)
 * hoặc vào từ quét QR (`QrDetails`). `AssetRelatedDetails` và `AssetHistoryDetail`
 * không truyền `setActiveTab`/`tabs` nên không có thanh tab.
 */
const RECORD_DETAILS_ROUTE_NAMES: Array<keyof RootStackParamList> = [
  "AssetDetails",
  "QrDetails",
];

/**
 * Về chi tiết bản ghi gốc bằng cách pop, dùng cho nút "bản ghi gốc" trên header
 * màn danh sách con: đường thường chi tiết cha nằm ngay dưới trong stack nên chỉ
 * cần pop — không push màn trùng, không phải nạp lại gì.
 *
 * Trả về `false` khi chi tiết cha không còn trong stack (sau luồng lưu/nhân bản,
 * `resetToAssetRelatedList` dựng lại stack `[Home, Asset, AssetRelatedList]`).
 * Lúc đó nơi gọi phải tự mở màn mới — và phải nạp trước `field`/`propertyClass`,
 * vì `AssetDetails` đọc `field` từ params (useDetailViewState) chứ không tự nạp.
 *
 * Ghi `activeTab: "list"` vào route đích: pill là "mở thông tin bản ghi gốc", mà
 * màn cha còn trong stack thì đang đứng ở tab Chi tiết (chỗ vừa bấm vào mục liên
 * quan) — pop trơn sẽ về đúng tab đó, không phải tab thông tin.
 */
export function popToRecordDetailsRoot(
  navigation: ResetNavigation,
  { id, nameClass }: { id: string; nameClass?: string },
) {
  return popToExistingRoute(
    navigation,
    RECORD_DETAILS_ROUTE_NAMES,
    { id, nameClass },
    { activeTab: "list" },
  );
}

export function resetToAssetRelatedList(
  navigation: ResetNavigation,
  {
    assetContext,
    relatedListParams,
  }: {
    assetContext: AssetRouteContext;
    relatedListParams: RootStackParamList["AssetRelatedList"];
  },
) {
  navigation.reset({
    index: 2,
    routes: [
      { name: "Home" },
      { name: "Asset", params: buildAssetParams(assetContext) },
      { name: "AssetRelatedList", params: relatedListParams },
    ],
  });
}

export function backToAssetRelatedList(
  navigation: ResetNavigation,
  {
    assetContext,
    relatedListParams,
  }: {
    assetContext: AssetRouteContext;
    relatedListParams: RootStackParamList["AssetRelatedList"];
  },
) {
  const didPop = popToExistingRoute(navigation, "AssetRelatedList", {
    nameClass: relatedListParams.nameClass,
    idRoot: relatedListParams.idRoot,
    propertyReference: relatedListParams.propertyReference,
  });

  if (!didPop) {
    resetToAssetRelatedList(navigation, { assetContext, relatedListParams });
  }
}
