import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { HomeNavigationProp } from "../../types";
import { usePermission } from "../../hooks/usePermission";
import HomeMenuItemCard from "./shared/HomeMenuItemCard";
import HomeStatCard from "./shared/HomeStatCard";
import HomeQuickAction from "./shared/HomeQuickAction";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import HomeRecentActivities from "./shared/HomeRecentActivities";
import { HOME_BG, HOME_BRAND_RED } from "./shared/homeTheme";
import {
  HOME_ASSET_SUMMARY,
  HOME_CAMERA_SUMMARY,
  HOME_RECENT_ACTIVITIES,
} from "./shared/homeData";
import {
  DEFAULT_HOME_FEATURE_IDS,
  normalizeHomeFeatureId,
  useHomeMenuItems,
} from "./shared/useHomeMenuItems";
import EmptyState from "../../components/ui/EmptyState";
import BottomSheetModalShell from "../../components/shared/BottomSheetModalShell";
import { useAppDispatch } from "../../store/hooks";
import { reloadPermissions } from "../../store/PermissionActions";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { readStoredAuthUsername } from "../../context/authStorage";
import { C } from "../../utils/helpers/colors";

const HOME_FEATURE_PINNED_IDS_KEY = "@home:pinnedFeatureIds";
const HOME_FEATURE_PINNED_IDS_USER_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:user`;
const HOME_FEATURE_PINNED_IDS_MIGRATED_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:view-active-migrated`;
const HOME_REPORT_PINNED_IDS_KEY = "@home:pinnedReportIds";
const HOME_REPORT_PINNED_IDS_USER_KEY = `${HOME_REPORT_PINNED_IDS_KEY}:user`;
const HOME_CONTENT_HORIZONTAL_PADDING = 16;
const HOME_FEATURE_GRID_GAP = 10;
const HOME_FEATURE_CARD_HEIGHT = 132;
const HOME_FEATURE_COLUMNS = 4;
const HOME_REPORT_COLUMNS = 3;

const getHomeFeaturePinnedIdsKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_FEATURE_PINNED_IDS_KEY;

  return `${HOME_FEATURE_PINNED_IDS_USER_KEY}:${encodeURIComponent(
    normalizedUserName
  )}`;
};

const getHomeFeaturePinnedIdsMigratedKey = (pinnedIdsKey: string) =>
  `${HOME_FEATURE_PINNED_IDS_MIGRATED_KEY}:${pinnedIdsKey}`;

const getHomeReportPinnedIdsKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_REPORT_PINNED_IDS_KEY;

  return `${HOME_REPORT_PINNED_IDS_USER_KEY}:${encodeURIComponent(
    normalizedUserName
  )}`;
};

type HomeReportCardProps = {
  isPinned?: boolean;
  label: string;
  onPress?: () => void;
  onTogglePinned?: () => void;
  showPinButton?: boolean;
};

function HomeReportCard({
  isPinned = false,
  label,
  onPress,
  onTogglePinned,
  showPinButton = false,
}: HomeReportCardProps) {
  const handleTogglePinned = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onTogglePinned?.();
  };

  return (
    <TouchableOpacity
      style={styles.reportCard}
      activeOpacity={0.76}
      onPress={onPress}
    >
      {showPinButton ? (
        <TouchableOpacity
          style={[
            styles.reportPinButton,
            isPinned && styles.reportPinButtonActive,
          ]}
          activeOpacity={0.76}
          onPress={handleTogglePinned}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={isPinned ? "checkmark" : "add"}
            size={14}
            color={isPinned ? "#fff" : "#7048E8"}
          />
        </TouchableOpacity>
      ) : null}

      <View style={styles.reportIconWrap}>
        <Ionicons
          name="document-text-outline"
          size={21}
          color="#7048E8"
        />
      </View>

      <View style={styles.reportTextWrap}>
        <Text
          style={styles.reportTitle}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      <View style={styles.reportArrowWrap}>
        <Ionicons name="arrow-forward" size={12} color="#7048E8" />
      </View>
    </TouchableOpacity>
  );
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const tabsNavigation = navigation.getParent() as any;
  const isFocused = useIsFocused();
  const { canView, loaded } = usePermission();
  const dispatch = useAppDispatch();
  const {
    menuItems,
    fetchHomeMenuItems,
    hasMenuLoadError,
    isMenuLoading,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
  } = useHomeMenuItems(navigation, tabsNavigation);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeatureListVisible, setIsFeatureListVisible] = useState(false);
  const [isVehicleListVisible, setIsVehicleListVisible] = useState(false);
  const [isReportListVisible, setIsReportListVisible] = useState(false);
  const [pinnedFeatureIds, setPinnedFeatureIds] = useState<string[]>(
    DEFAULT_HOME_FEATURE_IDS
  );
  const [pinnedReportIds, setPinnedReportIds] = useState<string[]>([]);
  const [hasPinnedReportPreference, setHasPinnedReportPreference] =
    useState(false);
  const [pinnedFeatureIdsKey, setPinnedFeatureIdsKey] = useState(
    HOME_FEATURE_PINNED_IDS_KEY
  );
  const [pinnedReportIdsKey, setPinnedReportIdsKey] = useState(
    HOME_REPORT_PINNED_IDS_KEY
  );

  useEffect(() => {
    let isActive = true;

    const loadPinnedFeatureIds = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        const nextPinnedFeatureIdsKey =
          getHomeFeaturePinnedIdsKey(storedUserName);
        const nextPinnedReportIdsKey = getHomeReportPinnedIdsKey(storedUserName);
        const migratedKey = getHomeFeaturePinnedIdsMigratedKey(
          nextPinnedFeatureIdsKey
        );
        const hasMigrated = await AsyncStorage.getItem(migratedKey);
        const rawValue = await AsyncStorage.getItem(nextPinnedFeatureIdsKey);
        const rawReportValue = await AsyncStorage.getItem(
          nextPinnedReportIdsKey
        );
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;
        const parsedReportValue = rawReportValue
          ? JSON.parse(rawReportValue)
          : null;

        if (isActive) {
          setPinnedReportIdsKey(nextPinnedReportIdsKey);

          if (Array.isArray(parsedReportValue)) {
            setHasPinnedReportPreference(true);
            setPinnedReportIds(
              parsedReportValue.filter(
                (id): id is string => typeof id === "string"
              )
            );
          }
        }

        if (isActive && Array.isArray(parsedValue)) {
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
        } else if (isActive) {
          setPinnedFeatureIdsKey(nextPinnedFeatureIdsKey);
          await AsyncStorage.setItem(migratedKey, "true");
        }
      } catch {
        if (isActive) {
          setPinnedFeatureIds(DEFAULT_HOME_FEATURE_IDS);
          setPinnedReportIds([]);
          setHasPinnedReportPreference(false);
        }
      }
    };

    loadPinnedFeatureIds();

    return () => {
      isActive = false;
    };
  }, []);

  const persistPinnedFeatureIds = useCallback(
    (nextIds: string[]) => {
      AsyncStorage.setItem(pinnedFeatureIdsKey, JSON.stringify(nextIds)).catch(
        () => undefined
      );
    },
    [pinnedFeatureIdsKey]
  );

  const persistPinnedReportIds = useCallback(
    (nextIds: string[]) => {
      AsyncStorage.setItem(pinnedReportIdsKey, JSON.stringify(nextIds)).catch(
        () => undefined
      );
    },
    [pinnedReportIdsKey]
  );

  const togglePinnedFeature = useCallback(
    (featureId: string) => {
      setPinnedFeatureIds((currentIds) => {
        const isPinned = currentIds.includes(featureId);
        const nextIds = isPinned
          ? currentIds.filter((id) => id !== featureId)
          : [...currentIds, featureId];

        persistPinnedFeatureIds(nextIds);
        return nextIds;
      });
    },
    [persistPinnedFeatureIds]
  );

  const loadPermissions = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      const isRefresh = options?.isRefresh === true;

      if (isRefresh) {
        setIsRefreshing(true);
      }

      try {
        const success = await dispatch(reloadPermissions());
        setHasLoadError(!success);
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
      let isActive = true;

      const ensurePermissions = async () => {
        if (!isActive) return;
        await loadPermissions();
      };

      ensurePermissions();

      return () => {
        isActive = false;
      };
    }, [loadPermissions])
  );

  useNetworkAwareReload(
    () => {
      loadPermissions();
      fetchHomeMenuItems();
    },
    {
      enabled: isFocused,
      hasError: hasLoadError || hasMenuLoadError,
      onOffline: () => {
        setHasLoadError(true);
      },
    }
  );

  const refreshHomeData = useCallback(async () => {
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
  const pinnedMenuItems = useMemo(() => {
    const visibleMenuItemsById = new Map(
      visibleFeatureItems.map((item) => [item.id, item])
    );

    return pinnedFeatureIds
      .map((id) => visibleMenuItemsById.get(id))
      .filter((item): item is (typeof visibleMenuItems)[number] => !!item);
  }, [pinnedFeatureIds, visibleFeatureItems]);
  const pinnedMenuRows = useMemo(() => {
    const rows: (typeof pinnedMenuItems)[] = [];

    for (let i = 0; i < pinnedMenuItems.length; i += HOME_FEATURE_COLUMNS) {
      rows.push(pinnedMenuItems.slice(i, i + HOME_FEATURE_COLUMNS));
    }

    return rows;
  }, [pinnedMenuItems]);
  const pinnedVehicleItems = useMemo(() => {
    const visibleVehicleItemsById = new Map(
      visibleVehicleItems.map((item) => [item.id, item])
    );

    return pinnedFeatureIds
      .map((id) => visibleVehicleItemsById.get(id))
      .filter((item): item is (typeof visibleVehicleItems)[number] => !!item);
  }, [pinnedFeatureIds, visibleVehicleItems]);
  const pinnedVehicleRows = useMemo(() => {
    const rows: (typeof pinnedVehicleItems)[] = [];

    for (let i = 0; i < pinnedVehicleItems.length; i += HOME_FEATURE_COLUMNS) {
      rows.push(pinnedVehicleItems.slice(i, i + HOME_FEATURE_COLUMNS));
    }

    return rows;
  }, [pinnedVehicleItems]);
  const hasNoViewFeatures = visibleFeatureItems.length === 0;
  const hasNoPinnedFeatures =
    !hasNoViewFeatures && pinnedMenuItems.length === 0;
  const hasNoPinnedVehicles =
    visibleVehicleItems.length > 0 && pinnedVehicleItems.length === 0;
  const isInitialMenuLoading = isMenuLoading && menuItems.length === 0;
  const canViewAllFeatures = visibleFeatureItems.length > 0;
  const canViewAssets = loaded && canView("TaiSan");
  const canViewCamera = loaded && canView("Camera");
  const visibleRecentActivities = useMemo(() => {
    if (!loaded) return [];
    return HOME_RECENT_ACTIVITIES.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true
    );
  }, [canView, loaded]);
  const hasOverviewStats = canViewCamera || canViewAssets;
  const hasRecentActivities = visibleRecentActivities.length > 0;
  const homeContentWidth = windowWidth - HOME_CONTENT_HORIZONTAL_PADDING * 2;
  const homeFeatureCardWidth =
    (homeContentWidth -
      HOME_FEATURE_GRID_GAP * Math.max(HOME_FEATURE_COLUMNS - 1, 0)) /
    HOME_FEATURE_COLUMNS;
  const homeReportCardWidth =
    (homeContentWidth -
      HOME_FEATURE_GRID_GAP * Math.max(HOME_REPORT_COLUMNS - 1, 0)) /
    HOME_REPORT_COLUMNS;
  const quickActions = useMemo(
    () => [
      {
        iconName: "qr-code-outline",
        label: "Quét QR",
        bg: C.indigoSurface,
        color: C.blue,
        onPress: openScanScreen,
      },
      {
        iconName: "notifications-outline",
        label: "Thông báo",
        bg: C.redSurface,
        color: HOME_BRAND_RED,
      },
      {
        iconName: "settings-outline",
        label: "Cài đặt",
        bg: C.greenLight,
        color: C.emerald,
        onPress: openSettingScreen,
      },
    ],
    [openScanScreen, openSettingScreen]
  );
  const reportActions = useMemo(
    () =>
      visibleFeatureItems
        .filter((item) => typeof item.groupMenuId === "number")
        .map((item) => ({
          ...item,
          iconName: "document-text-outline",
          onPress: () =>
            openReportScreen({
              groupMenuId: item.groupMenuId,
              titleHeader: item.label,
              viewPermission: item.viewPermission,
            }),
        })),
    [openReportScreen, visibleFeatureItems]
  );
  const togglePinnedReport = useCallback(
    (reportId: string) => {
      setPinnedReportIds((currentIds) => {
        const currentVisibleIds = hasPinnedReportPreference
          ? currentIds
          : reportActions
              .slice(0, HOME_REPORT_COLUMNS)
              .map((report) => report.id);
        const isPinned = currentVisibleIds.includes(reportId);
        const nextIds = isPinned
          ? currentVisibleIds.filter((id) => id !== reportId)
          : [...currentVisibleIds, reportId];

        setHasPinnedReportPreference(true);
        persistPinnedReportIds(nextIds);
        return nextIds;
      });
    },
    [hasPinnedReportPreference, persistPinnedReportIds, reportActions]
  );
  const pinnedReportActions = useMemo(() => {
    const reportActionsById = new Map(
      reportActions.map((item) => [item.id, item])
    );
    const visibleReportIds = hasPinnedReportPreference
      ? pinnedReportIds
      : reportActions.slice(0, HOME_REPORT_COLUMNS).map((item) => item.id);

    return visibleReportIds
      .map((id) => reportActionsById.get(id))
      .filter((item): item is (typeof reportActions)[number] => !!item);
  }, [hasPinnedReportPreference, pinnedReportIds, reportActions]);
  const visiblePinnedReportActions = useMemo(
    () => pinnedReportActions.slice(0, HOME_REPORT_COLUMNS),
    [pinnedReportActions]
  );
  const visiblePinnedReportIds = useMemo(
    () => new Set(pinnedReportActions.map((item) => item.id)),
    [pinnedReportActions]
  );
  const hasNoPinnedReports =
    hasPinnedReportPreference &&
    reportActions.length > 0 &&
    pinnedReportActions.length === 0;

  if (hasLoadError || hasMenuLoadError) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHomeData}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Trang chủ"
          subtitle="Vui lòng kiểm tra kết nối hoặc kéo xuống để thử lại."
        />
      </ScrollView>
    );
  }

  if (!loaded || isInitialMenuLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={HOME_BRAND_RED} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHomeData}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        <HomeSectionTitle
          label="CHỨC NĂNG"
          action={canViewAllFeatures ? "Xem tất cả" : undefined}
          onAction={() => setIsFeatureListVisible(true)}
        />
        {hasNoViewFeatures ? (
          <View style={styles.noPermissionCard}>
            <EmptyState
              iconName="lock-closed-outline"
              title="Chưa có chức năng khả dụng"
              subtitle="Tài khoản hiện tại chưa được cấp quyền xem chức năng nào. Vui lòng liên hệ IT nếu bạn cần thêm quyền truy cập."
              fullHeight={false}
            />
          </View>
        ) : hasNoPinnedFeatures ? (
          <View style={styles.noPermissionCard}>
            <EmptyState
              iconName="add-circle-outline"
              title="Chưa chọn chức năng hiển thị"
              subtitle="Bấm Xem tất cả rồi chọn dấu + để đưa chức năng ra Trang chủ."
              fullHeight={false}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {pinnedMenuRows.map((rowItems, rowIndex) => (
              <View key={`feature-row-${rowIndex}`} style={styles.gridRow}>
                {rowItems.map((item, itemIndex) => (
                  <View
                    key={item.id}
                    style={[
                      styles.homeGridItem,
                      { width: homeFeatureCardWidth },
                    ]}
                  >
                    <HomeMenuItemCard
                      {...item}
                      index={rowIndex * HOME_FEATURE_COLUMNS + itemIndex}
                      fixedHeight
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {visibleVehicleItems.length > 0 ? (
          <>
            <HomeSectionTitle
              label="PHƯƠNG TIỆN"
              action="Xem tất cả"
              onAction={() => setIsVehicleListVisible(true)}
            />
            {hasNoPinnedVehicles ? (
              <View style={styles.noPermissionCard}>
                <EmptyState
                  iconName="add-circle-outline"
                  title="Chưa chọn chức năng phương tiện"
                  subtitle="Bấm Xem tất cả rồi chọn dấu + để đưa chức năng ra Trang chủ."
                  fullHeight={false}
                />
              </View>
            ) : (
              <View style={styles.grid}>
                {pinnedVehicleRows.map((rowItems, rowIndex) => (
                  <View key={`vehicle-row-${rowIndex}`} style={styles.gridRow}>
                    {rowItems.map((item, itemIndex) => (
                      <View
                        key={item.id}
                        style={[
                          styles.homeGridItem,
                          { width: homeFeatureCardWidth },
                        ]}
                      >
                        <HomeMenuItemCard
                          {...item}
                          index={rowIndex * HOME_FEATURE_COLUMNS + itemIndex}
                          fixedHeight
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {reportActions.length > 0 ? (
          <>
            <HomeSectionTitle
              label="BÁO CÁO"
              action="Xem tất cả"
              onAction={() => setIsReportListVisible(true)}
            />
            {hasNoPinnedReports ? (
              <View style={styles.noPermissionCard}>
                <EmptyState
                  iconName="add-circle-outline"
                  title="Chưa chọn báo cáo hiển thị"
                  subtitle="Bấm Xem tất cả rồi chọn dấu + để đưa báo cáo ra Trang chủ."
                  fullHeight={false}
                />
              </View>
            ) : (
              <View style={styles.reportList}>
                {visiblePinnedReportActions.map((item) => (
                  <View
                    key={`report-${item.id}`}
                    style={[
                      styles.reportGridItem,
                      { width: homeReportCardWidth },
                    ]}
                  >
                    <HomeReportCard
                      label={item.label}
                      onPress={item.onPress}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        <HomeSectionTitle label="THAO TÁC NHANH" />
        <View style={styles.qaCard}>
          {quickActions.map((action, index) => (
            <React.Fragment key={action.label}>
              {index > 0 ? <View style={styles.qaDivider} /> : null}
              <HomeQuickAction {...action} />
            </React.Fragment>
          ))}
        </View>

        {hasOverviewStats ? (
          <>
            <HomeSectionTitle label="TỔNG QUAN" />
            <View style={styles.statsRow}>
              {canViewCamera ? (
                <HomeStatCard
                  value={String(HOME_CAMERA_SUMMARY.totalCameras)}
                  label="Camera đang quản lý"
                  sub="Cập nhật hôm nay"
                  subColor={C.emerald}
                  iconName="videocam-outline"
                  iconBg={C.greenLight}
                  iconColor={C.emerald}
                />
              ) : null}
              {canViewAssets ? (
                <HomeStatCard
                  value={String(HOME_ASSET_SUMMARY.totalAssets)}
                  label="Tài sản đang quản lý"
                  sub="Cập nhật hôm nay"
                  subColor={C.textMuted}
                  iconName="cube-outline"
                  iconBg={C.redIconSurface}
                  iconColor={HOME_BRAND_RED}
                  trend="neutral"
                />
              ) : null}
            </View>
          </>
        ) : null}
        {hasRecentActivities ? (
          <>
            <HomeSectionTitle label="HOẠT ĐỘNG GẦN ĐÂY" action="Xem tất cả" />
            <HomeRecentActivities items={visibleRecentActivities} />
          </>
        ) : null}
      </ScrollView>
      <BottomSheetModalShell
        visible={isFeatureListVisible}
        onClose={() => setIsFeatureListVisible(false)}
        closeOnBackdropPress
        showCloseButton
        showHandle
        sheetStyle={styles.featureSheet}
      >
        <Text style={styles.featureSheetTitle} allowFontScaling={false}>
          Tất cả chức năng
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.featureSheetContent}
        >
          <View style={styles.featureGrid}>
            {visibleFeatureItems.map((item, index) => (
              <View key={item.id} style={styles.featureGridItem}>
                <HomeMenuItemCard
                  {...item}
                  index={index}
                  showPinButton
                  isPinned={pinnedFeatureIds.includes(item.id)}
                  onTogglePinned={() => togglePinnedFeature(item.id)}
                  onPress={() => {
                    setIsFeatureListVisible(false);
                    requestAnimationFrame(() => item.onPress?.());
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheetModalShell>
      <BottomSheetModalShell
        visible={isVehicleListVisible}
        onClose={() => setIsVehicleListVisible(false)}
        closeOnBackdropPress
        showCloseButton
        showHandle
        sheetStyle={styles.featureSheet}
      >
        <Text style={styles.featureSheetTitle} allowFontScaling={false}>
          Tất cả chức năng phương tiện
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.featureSheetContent}
        >
          <View style={styles.featureGrid}>
            {visibleVehicleItems.map((item, index) => (
              <View key={item.id} style={styles.featureGridItem}>
                <HomeMenuItemCard
                  {...item}
                  index={index}
                  showPinButton
                  isPinned={pinnedFeatureIds.includes(item.id)}
                  onTogglePinned={() => togglePinnedFeature(item.id)}
                  onPress={() => {
                    setIsVehicleListVisible(false);
                    requestAnimationFrame(() => item.onPress?.());
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheetModalShell>
      <BottomSheetModalShell
        visible={isReportListVisible}
        onClose={() => setIsReportListVisible(false)}
        closeOnBackdropPress
        showCloseButton
        showHandle
        sheetStyle={styles.featureSheet}
      >
        <Text style={styles.featureSheetTitle} allowFontScaling={false}>
          Tất cả báo cáo
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.featureSheetContent}
        >
          <View style={styles.reportSheetGrid}>
            {reportActions.map((item) => (
              <View
                key={`report-sheet-${item.id}`}
                style={[
                  styles.reportSheetGridItem,
                  { width: homeReportCardWidth },
                ]}
              >
                <HomeReportCard
                  isPinned={visiblePinnedReportIds.has(item.id)}
                  label={item.label}
                  showPinButton
                  onTogglePinned={() => togglePinnedReport(item.id)}
                  onPress={() => {
                    setIsReportListVisible(false);
                    requestAnimationFrame(() => item.onPress?.());
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheetModalShell>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HOME_BG },
  loadingWrap: {
    flex: 1,
    backgroundColor: HOME_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    backgroundColor: HOME_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },

  grid: {
    flexDirection: "column",
    gap: HOME_FEATURE_GRID_GAP,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: "row",
    gap: HOME_FEATURE_GRID_GAP,
  },
  homeGridItem: {
    height: HOME_FEATURE_CARD_HEIGHT,
  },
  featureSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  featureSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 14,
    paddingRight: 44,
  },
  featureSheetContent: {
    paddingBottom: 20,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureGridItem: {
    width: "48%",
  },
  noPermissionCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },

  reportList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: HOME_FEATURE_GRID_GAP,
    marginBottom: 14,
  },
  reportGridItem: {
    minHeight: 118,
  },
  reportCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.violetBorder,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reportTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 6,
  },
  reportArrowWrap: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPinButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.violetBorder,
    backgroundColor: C.violetSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPinButtonActive: {
    borderColor: "#7048E8",
    backgroundColor: "#7048E8",
  },
  reportSheetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reportSheetGridItem: {
    minHeight: 118,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  qaCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  qaDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },
});

export default HomeScreen;
