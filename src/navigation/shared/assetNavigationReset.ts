import { StackActions } from "@react-navigation/native";
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

function popToExistingRoute(
  navigation: ResetNavigation,
  routeName: keyof RootStackParamList,
  expectedParams: Record<string, any>,
) {
  const state = navigation.getState?.();
  if (!state || typeof state.index !== "number" || !navigation.dispatch) {
    return false;
  }

  const targetIndex = state.routes
    .slice(0, state.index)
    .map((route, index) => ({ route, index }))
    .reverse()
    .find(
      ({ route }) =>
        route.name === routeName && matchesParams(route.params, expectedParams),
    )?.index;

  if (targetIndex === undefined) return false;

  const popCount = state.index - targetIndex;
  if (popCount <= 0) return false;

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
