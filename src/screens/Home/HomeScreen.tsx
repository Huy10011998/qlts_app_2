import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import type { HomeNavigationProp } from "../../types";
import { usePermission } from "../../hooks/usePermission";
import HomeMenuItemCard from "./shared/HomeMenuItemCard";
import HomeEventBanner from "./shared/HomeEventBanner";
import HomeStatCard from "./shared/HomeStatCard";
import HomeQuickAction from "./shared/HomeQuickAction";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import HomeRecentActivities from "./shared/HomeRecentActivities";
import { HOME_BG, HOME_BRAND_RED } from "./shared/homeTheme";
import {
  HOME_ASSET_SUMMARY,
  HOME_MEETING_INFO,
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

const HOME_FEATURE_PINNED_IDS_KEY = "@home:pinnedFeatureIds";
const HOME_FEATURE_PINNED_IDS_USER_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:user`;
const HOME_FEATURE_PINNED_IDS_MIGRATED_KEY = `${HOME_FEATURE_PINNED_IDS_KEY}:view-active-migrated`;
const HOME_CONTENT_HORIZONTAL_PADDING = 16;
const HOME_FEATURE_GRID_GAP = 10;
const HOME_FEATURE_CARD_HEIGHT = 132;
const HOME_FEATURE_COLUMNS = 4;

const getHomeFeaturePinnedIdsKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_FEATURE_PINNED_IDS_KEY;

  return `${HOME_FEATURE_PINNED_IDS_USER_KEY}:${encodeURIComponent(
    normalizedUserName
  )}`;
};

const getHomeFeaturePinnedIdsMigratedKey = (pinnedIdsKey: string) =>
  `${HOME_FEATURE_PINNED_IDS_MIGRATED_KEY}:${pinnedIdsKey}`;

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
    openMeetingScreen,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
  } = useHomeMenuItems(navigation, tabsNavigation);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeatureListVisible, setIsFeatureListVisible] = useState(false);
  const [pinnedFeatureIds, setPinnedFeatureIds] = useState<string[]>(
    DEFAULT_HOME_FEATURE_IDS
  );
  const [pinnedFeatureIdsKey, setPinnedFeatureIdsKey] = useState(
    HOME_FEATURE_PINNED_IDS_KEY
  );

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
        const hasMigrated = await AsyncStorage.getItem(migratedKey);
        const rawValue = await AsyncStorage.getItem(nextPinnedFeatureIdsKey);
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;

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
  const pinnedMenuItems = useMemo(() => {
    const visibleMenuItemsById = new Map(
      visibleMenuItems.map((item) => [item.id, item])
    );

    return pinnedFeatureIds
      .map((id) => visibleMenuItemsById.get(id))
      .filter((item): item is (typeof visibleMenuItems)[number] => !!item);
  }, [pinnedFeatureIds, visibleMenuItems]);
  const pinnedMenuRows = useMemo(() => {
    const rows: (typeof pinnedMenuItems)[] = [];

    for (let i = 0; i < pinnedMenuItems.length; i += HOME_FEATURE_COLUMNS) {
      rows.push(pinnedMenuItems.slice(i, i + HOME_FEATURE_COLUMNS));
    }

    return rows;
  }, [pinnedMenuItems]);
  const hasNoViewFeatures = visibleMenuItems.length === 0;
  const hasNoPinnedFeatures =
    !hasNoViewFeatures && pinnedMenuItems.length === 0;
  const isInitialMenuLoading = isMenuLoading && menuItems.length === 0;
  const canViewAllFeatures = visibleMenuItems.length > 0;
  const canViewAssets = loaded && canView("TaiSan");
  const canViewShareholdersMeeting = loaded && canView("DHCD");
  const canViewAssetReports = canViewAssets;
  const visibleRecentActivities = useMemo(() => {
    if (!loaded) return [];
    return HOME_RECENT_ACTIVITIES.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true
    );
  }, [canView, loaded]);
  const hasOverviewStats = canViewShareholdersMeeting || canViewAssets;
  const hasRecentActivities = visibleRecentActivities.length > 0;
  const homeContentWidth = windowWidth - HOME_CONTENT_HORIZONTAL_PADDING * 2;
  const homeFeatureCardWidth =
    (homeContentWidth -
      HOME_FEATURE_GRID_GAP * Math.max(HOME_FEATURE_COLUMNS - 1, 0)) /
    HOME_FEATURE_COLUMNS;
  const quickActions = useMemo(
    () => [
      {
        iconName: "qr-code-outline",
        label: "Quét QR",
        bg: "#F0F4FF",
        color: "#3B5BDB",
        onPress: openScanScreen,
      },
      ...(canViewAssetReports
        ? [
            {
              iconName: "document-text-outline",
              label: "Báo cáo",
              bg: "#F3F0FF",
              color: "#7048E8",
              onPress: openReportScreen,
            },
          ]
        : []),
      {
        iconName: "notifications-outline",
        label: "Thông báo",
        bg: "#FFF5F5",
        color: HOME_BRAND_RED,
      },
      {
        iconName: "settings-outline",
        label: "Cài đặt",
        bg: "#F0FBF7",
        color: "#10B981",
        onPress: openSettingScreen,
      },
    ],
    [canViewAssetReports, openReportScreen, openScanScreen, openSettingScreen]
  );

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
        {canViewShareholdersMeeting ? (
          <>
            <HomeSectionTitle label="SỰ KIỆN" action="Xem tất cả" />
            <HomeEventBanner
              title={HOME_MEETING_INFO.meetingTitle}
              date={HOME_MEETING_INFO.meetingDate}
              time={HOME_MEETING_INFO.meetingTime}
              venue={HOME_MEETING_INFO.meetingVenue}
              count={HOME_MEETING_INFO.totalShareholders}
              onPress={openMeetingScreen}
            />
          </>
        ) : null}

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
              {canViewShareholdersMeeting ? (
                <HomeStatCard
                  value={String(HOME_MEETING_INFO.totalShareholders)}
                  label="Cổ đông tham dự"
                  sub="Cập nhật hôm nay"
                  subColor="#10B981"
                  iconName="people-circle-outline"
                  iconBg="#E8FBF3"
                  iconColor="#10B981"
                  trend="up"
                />
              ) : null}
              {canViewAssets ? (
                <HomeStatCard
                  value={String(HOME_ASSET_SUMMARY.totalAssets)}
                  label="Tài sản đang quản lý"
                  sub="Cập nhật hôm nay"
                  subColor="#8A95A3"
                  iconName="cube-outline"
                  iconBg="#FFF0F0"
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
        <Text style={styles.featureSheetTitle}>Tất cả chức năng</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.featureSheetContent}
        >
          <View style={styles.featureGrid}>
            {visibleMenuItems.map((item, index) => (
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
    color: "#111827",
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
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  qaCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  qaDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#EDF0F5",
  },
});

export default HomeScreen;
