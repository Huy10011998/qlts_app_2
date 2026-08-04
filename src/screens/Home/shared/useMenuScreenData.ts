import { useCallback, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

import type { HomeNavigationProp } from "../../../types";
import { usePermission } from "../../../hooks/usePermission";
import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import { useAppDispatch } from "../../../store/hooks";
import { reloadPermissions } from "../../../store/PermissionActions";
import { useHomeMenuItems } from "./useHomeMenuItems";
import { createReportActions } from "./homeMenuHelpers";
import {
  HOME_CONTENT_HORIZONTAL_PADDING,
  HOME_FEATURE_GRID_GAP,
} from "../HomeScreen.styles";

export const MENU_FEATURE_COLUMNS = 4;
export const MENU_REPORT_COLUMNS = 3;

export const chunkMenuItems = <T,>(items: T[], size: number) => {
  const rows: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }

  return rows;
};

/**
 * Phần dùng chung của màn danh mục (tab Chức năng) và Trang chủ: nạp lại quyền
 * khi focus, kéo-để-làm-mới, và chia danh sách chức năng theo nhóm.
 *
 * Tách ra để hai màn không phải giữ hai bản copy của cùng một vòng đời.
 */
export function useMenuScreenData(navigation: HomeNavigationProp) {
  const tabsNavigation = navigation.getParent() as any;
  const { width: windowWidth } = useWindowDimensions();
  const isFocused = useIsFocused();
  const { canView, loaded } = usePermission();
  const dispatch = useAppDispatch();
  const {
    menuItems,
    fetchHomeMenuItems,
    hasMenuLoadError,
    isMenuLoading,
    openReportScreen,
  } = useHomeMenuItems(navigation, tabsNavigation);
  const [hasPermissionLoadError, setHasPermissionLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPermissions = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      const isRefresh = options?.isRefresh === true;

      if (isRefresh) {
        setIsRefreshing(true);
      }

      try {
        const success = await dispatch(reloadPermissions());
        setHasPermissionLoadError(!success);
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [dispatch]
  );

  useFocusEffect(
    useCallback(() => {
      loadPermissions();
    }, [loadPermissions])
  );

  useNetworkAwareReload(
    () => {
      loadPermissions();
      fetchHomeMenuItems();
    },
    {
      enabled: isFocused,
      hasError: hasPermissionLoadError || hasMenuLoadError,
      onOffline: () => {
        setHasPermissionLoadError(true);
      },
    }
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadPermissions({ isRefresh: true }),
      fetchHomeMenuItems(),
    ]);
    setIsRefreshing(false);
  }, [fetchHomeMenuItems, loadPermissions]);

  const visibleMenuItems = useMemo(() => {
    if (!loaded) return [];
    return menuItems.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true
    );
  }, [canView, loaded, menuItems]);
  const visibleVehicleItems = useMemo(
    () => visibleMenuItems.filter((item) => item.homeGroup === "vehicle"),
    [visibleMenuItems]
  );
  const visibleFeatureItems = useMemo(
    () => visibleMenuItems.filter((item) => item.homeGroup !== "vehicle"),
    [visibleMenuItems]
  );
  const reportActions = useMemo(
    () => createReportActions(visibleFeatureItems, openReportScreen),
    [openReportScreen, visibleFeatureItems]
  );

  const contentWidth = windowWidth - HOME_CONTENT_HORIZONTAL_PADDING * 2;
  const featureCardWidth =
    (contentWidth -
      HOME_FEATURE_GRID_GAP * Math.max(MENU_FEATURE_COLUMNS - 1, 0)) /
    MENU_FEATURE_COLUMNS;
  const reportCardWidth =
    (contentWidth -
      HOME_FEATURE_GRID_GAP * Math.max(MENU_REPORT_COLUMNS - 1, 0)) /
    MENU_REPORT_COLUMNS;

  return {
    featureCardWidth,
    hasError: hasPermissionLoadError || hasMenuLoadError,
    isLoading: !loaded || (isMenuLoading && menuItems.length === 0),
    isRefreshing,
    refresh,
    reportActions,
    reportCardWidth,
    visibleFeatureItems,
    visibleVehicleItems,
  };
}
