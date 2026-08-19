import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { API_ENDPOINTS } from "../../../config";
import { readStoredAuthUsername } from "../../../context/authStorage";
import { callApi } from "../../../services/data/callApi";
import type { GetViewActiveResponse, Item, ViewActiveItem } from "../../../types";
import { error, log } from "../../../utils/Logger";
import { useHomeBlockOrder } from "./useHomeBlockOrder";
import type { HomeBlockKey } from "./homeBlockOrder";
import {
  DEFAULT_HOME_FEATURE_IDS,
  isVehicleCurrentLocationMobileView,
  isVehicleJourneyMobileView,
  isVehicleTrackingMobileView,
  getViewOrderNumber,
  normalizeHomeFeatureId,
} from "./homeMenuHelpers";

const HOME_FEATURE_PINNED_IDS_KEY = "@home:pinnedFeatureIds";
const HOME_FEATURE_PINNED_IDS_USER_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:user`;
const HOME_FEATURE_PINNED_IDS_MIGRATED_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:view-active-migrated`;

const getHomeFeaturePinnedIdsKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_FEATURE_PINNED_IDS_KEY;

  return `${HOME_FEATURE_PINNED_IDS_USER_KEY}:${encodeURIComponent(
    normalizedUserName
  )}`;
};

const getHomeFeaturePinnedIdsMigratedKey = (pinnedIdsKey: string) =>
  `${HOME_FEATURE_PINNED_IDS_MIGRATED_KEY}:${pinnedIdsKey}`;

type HomeMenuContextValue = {
  apiViews: ViewActiveItem[];
  /** Thứ tự các khối Trang chủ, gồm cả khối đang bị ẩn. */
  blockOrder: HomeBlockKey[];
  closeBlockOrderSheet: () => void;
  fetchHomeMenuItems: () => Promise<void>;
  hasMenuLoadError: boolean;
  isBlockOrderSheetVisible: boolean;
  /** Lượt làm mới do nút trên header bấm — để nút tự quay trong lúc chờ. */
  isHomeRefreshing: boolean;
  isMenuLoading: boolean;
  /**
   * Lượt gọi GET_VIEW_ACTIVE/GET_MENU_ACTIVE đầu tiên đã xong chưa (dù thành
   * công hay lỗi). Không suy ra được từ `menuItems.length` vì danh sách luôn có
   * sẵn mục tĩnh "Điện mặt trời" — đếm độ dài là cổng chờ không bao giờ đóng.
   */
  hasLoadedMenuOnce: boolean;
  /**
   * Danh sách ghim đọc từ AsyncStorage/Keychain xong chưa. Trên Android chuỗi
   * đọc này (SQLite + Android Keystore) chậm hơn hẳn iOS và thường về SAU lời
   * gọi menu — render sớm là Truy cập nhanh chớp qua "Chưa ghim chức năng nào"
   * rồi mới nhảy ra đúng danh sách của user.
   */
  isPinnedFeatureIdsLoading: boolean;
  moveBlock: (args: {
    visibleKeys: HomeBlockKey[];
    fromIndex: number;
    toIndex: number;
  }) => void;
  openBlockOrderSheet: () => void;
  pinnedFeatureIds: string[];
  /**
   * HomeScreen đăng ký hàm làm mới của chính nó ở đây; trả về hàm bỏ đăng ký.
   * Nút làm mới nằm trên header (do navigator dựng) nên không gọi trực tiếp được.
   */
  registerHomeRefresh: (refresh: () => Promise<void>) => () => void;
  /** Chạy lượt làm mới mà HomeScreen đã đăng ký. */
  refreshHome: () => Promise<void>;
  togglePinnedFeature: (featureId: string) => void;
  vehicleCurrentLocationMenuItem: Item | null;
  vehicleJourneyMenuItem: Item | null;
  vehicleTrackingMenuItem: Item | null;
};

const HomeMenuContext = createContext<HomeMenuContextValue | null>(null);

/**
 * Trạng thái menu + ghim của Trang chủ, nâng lên trên `Tab.Navigator`.
 *
 * Trước đây cả hai nằm trong component: state ghim ở HomeScreen, còn lời gọi
 * GET_VIEW_ACTIVE/GET_MENU_ACTIVE ở trong `useHomeMenuItems`. Từ khi có tab Chức
 * năng thì hai màn hình cùng cần chúng, và `Tabs` đang đặt `lazy: false` nên cả
 * hai mount ngay lúc khởi động — để nguyên là 4 request mỗi lần mở app và hai
 * bản state ghim rời nhau (ghim ở tab này, Trang chủ tab kia không thấy).
 */
export function HomeMenuProvider({ children }: React.PropsWithChildren) {
  const [apiViews, setApiViews] = useState<ViewActiveItem[]>([]);
  const [vehicleJourneyMenuItem, setVehicleJourneyMenuItem] =
    useState<Item | null>(null);
  const [vehicleTrackingMenuItem, setVehicleTrackingMenuItem] =
    useState<Item | null>(null);
  const [vehicleCurrentLocationMenuItem, setVehicleCurrentLocationMenuItem] =
    useState<Item | null>(null);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [hasLoadedMenuOnce, setHasLoadedMenuOnce] = useState(false);
  const [hasMenuLoadError, setHasMenuLoadError] = useState(false);
  const [pinnedFeatureIds, setPinnedFeatureIds] = useState<string[]>(
    DEFAULT_HOME_FEATURE_IDS
  );
  const [pinnedFeatureIdsKey, setPinnedFeatureIdsKey] = useState(
    HOME_FEATURE_PINNED_IDS_KEY
  );
  const [isPinnedFeatureIdsLoading, setIsPinnedFeatureIdsLoading] =
    useState(true);
  const fetchingRef = useRef(false);
  const { blockOrder, moveBlock } = useHomeBlockOrder();
  // Nút mở bảng sắp xếp nằm trên header (do navigator dựng), còn bảng thì nằm
  // trong HomeScreen — nên trạng thái mở/đóng phải ở trên cả hai.
  const [isBlockOrderSheetVisible, setIsBlockOrderSheetVisible] =
    useState(false);
  const openBlockOrderSheet = useCallback(
    () => setIsBlockOrderSheetVisible(true),
    []
  );
  const closeBlockOrderSheet = useCallback(
    () => setIsBlockOrderSheetVisible(false),
    []
  );

  // Nút làm mới cũng ở header như nút sắp xếp, nhưng việc làm mới thì nằm trong
  // HomeScreen (permission + menu + dashboard) — nên header gọi qua chỗ đăng ký này.
  const homeRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const [isHomeRefreshing, setIsHomeRefreshing] = useState(false);
  const registerHomeRefresh = useCallback((refresh: () => Promise<void>) => {
    homeRefreshRef.current = refresh;

    return () => {
      if (homeRefreshRef.current === refresh) {
        homeRefreshRef.current = null;
      }
    };
  }, []);
  const refreshHome = useCallback(async () => {
    const refresh = homeRefreshRef.current;

    // Bấm liên tục thì bỏ qua: lượt đang chạy đã gọi đúng những API đó rồi.
    if (!refresh || isHomeRefreshing) return;

    setIsHomeRefreshing(true);

    try {
      await refresh();
    } finally {
      setIsHomeRefreshing(false);
    }
  }, [isHomeRefreshing]);

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
            (item) => getViewOrderNumber(item) !== 1 && item.isActive !== false
          )
          .sort((a, b) => getViewOrderNumber(a) - getViewOrderNumber(b))
      );
      const groupTwoMenuItems = Array.isArray(menuResponse?.data)
        ? menuResponse.data.filter((item) => Number(item.iD_GroupMenu) === 2)
        : [];
      const vehicleJourneyItem =
        groupTwoMenuItems.find(isVehicleJourneyMobileView) ?? null;
      const vehicleTrackingItem =
        groupTwoMenuItems.find(isVehicleTrackingMobileView) ?? null;
      const vehicleCurrentLocationItem =
        groupTwoMenuItems.find(isVehicleCurrentLocationMobileView) ?? null;

      log("[HomeMenu] GET_MENU_ACTIVE itemGroup = 2", groupTwoMenuItems);
      log("[HomeMenu] VehicleJourney matched item", vehicleJourneyItem);
      log("[HomeMenu] VehicleTracking matched item", vehicleTrackingItem);
      log(
        "[HomeMenu] VehicleCurrentLocation matched item",
        vehicleCurrentLocationItem
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
      setHasLoadedMenuOnce(true);
    }
  }, []);

  useEffect(() => {
    fetchHomeMenuItems();
  }, [fetchHomeMenuItems]);

  useEffect(() => {
    let isActive = true;

    const loadPinnedFeatureIds = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        const nextPinnedFeatureIdsKey =
          getHomeFeaturePinnedIdsKey(storedUserName);
        const migratedKey = getHomeFeaturePinnedIdsMigratedKey(
          nextPinnedFeatureIdsKey
        );
        // Hai khoá độc lập nhau — đọc song song để rút bớt một vòng cầu nối.
        const [hasMigrated, rawValue] = await AsyncStorage.multiGet([
          migratedKey,
          nextPinnedFeatureIdsKey,
        ]).then(([migrated, stored]) => [migrated[1], stored[1]]);
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;

        if (!isActive) return;

        if (Array.isArray(parsedValue)) {
          const nextPinnedFeatureIds = parsedValue
            .filter((id): id is string => typeof id === "string")
            .map((id) => (hasMigrated ? id : normalizeHomeFeatureId(id)));

          setPinnedFeatureIdsKey(nextPinnedFeatureIdsKey);
          setPinnedFeatureIds(nextPinnedFeatureIds);

          if (!hasMigrated) {
            await AsyncStorage.multiSet([
              [nextPinnedFeatureIdsKey, JSON.stringify(nextPinnedFeatureIds)],
              [migratedKey, "true"],
            ]);
          }
        } else {
          setPinnedFeatureIdsKey(nextPinnedFeatureIdsKey);
          await AsyncStorage.setItem(migratedKey, "true");
        }
      } catch {
        if (isActive) {
          setPinnedFeatureIds(DEFAULT_HOME_FEATURE_IDS);
        }
      } finally {
        if (isActive) setIsPinnedFeatureIdsLoading(false);
      }
    };

    loadPinnedFeatureIds();

    return () => {
      isActive = false;
    };
  }, []);

  const togglePinnedFeature = useCallback(
    (featureId: string) => {
      setPinnedFeatureIds((currentIds) => {
        const isPinned = currentIds.includes(featureId);
        const nextIds = isPinned
          ? currentIds.filter((id) => id !== featureId)
          : [...currentIds, featureId];

        AsyncStorage.setItem(
          pinnedFeatureIdsKey,
          JSON.stringify(nextIds)
        ).catch(() => undefined);

        return nextIds;
      });
    },
    [pinnedFeatureIdsKey]
  );

  const value = useMemo<HomeMenuContextValue>(
    () => ({
      apiViews,
      blockOrder,
      closeBlockOrderSheet,
      fetchHomeMenuItems,
      hasMenuLoadError,
      isBlockOrderSheetVisible,
      isHomeRefreshing,
      hasLoadedMenuOnce,
      isMenuLoading,
      isPinnedFeatureIdsLoading,
      moveBlock,
      openBlockOrderSheet,
      pinnedFeatureIds,
      refreshHome,
      registerHomeRefresh,
      togglePinnedFeature,
      vehicleCurrentLocationMenuItem,
      vehicleJourneyMenuItem,
      vehicleTrackingMenuItem,
    }),
    [
      apiViews,
      blockOrder,
      closeBlockOrderSheet,
      fetchHomeMenuItems,
      hasMenuLoadError,
      isBlockOrderSheetVisible,
      isHomeRefreshing,
      hasLoadedMenuOnce,
      isMenuLoading,
      isPinnedFeatureIdsLoading,
      moveBlock,
      openBlockOrderSheet,
      pinnedFeatureIds,
      refreshHome,
      registerHomeRefresh,
      togglePinnedFeature,
      vehicleCurrentLocationMenuItem,
      vehicleJourneyMenuItem,
      vehicleTrackingMenuItem,
    ]
  );

  return (
    <HomeMenuContext.Provider value={value}>
      {children}
    </HomeMenuContext.Provider>
  );
}

export function useHomeMenuContext() {
  const value = useContext(HomeMenuContext);

  if (!value) {
    throw new Error("useHomeMenuContext phải nằm trong <HomeMenuProvider>");
  }

  return value;
}
