import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { HomeNavigationProp } from "../../types";
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
import { useHomeMenuItems } from "./shared/useHomeMenuItems";
import EmptyState from "../../components/ui/EmptyState";
import { useAppDispatch } from "../../store/hooks";
import { reloadPermissions } from "../../store/PermissionActions";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const tabsNavigation = navigation.getParent() as any;
  const isFocused = useIsFocused();
  const { canView, loaded } = usePermission();
  const dispatch = useAppDispatch();
  const {
    menuItems,
    openMeetingScreen,
    openReportScreen,
    openScanScreen,
    openSettingScreen,
  } = useHomeMenuItems(navigation, tabsNavigation);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    },
    {
      enabled: isFocused,
      hasError: hasLoadError,
      onOffline: () => {
        setHasLoadError(true);
      },
    }
  );

  const visibleMenuItems = useMemo(() => {
    if (!loaded) return [];
    return menuItems.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true
    );
  }, [canView, loaded, menuItems]);
  const hasNoViewFeatures = visibleMenuItems.length === 0;
  const canViewAssetReports = loaded && canView("TaiSan");

  if (hasLoadError) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPermissions({ isRefresh: true })}
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

  if (!loaded) {
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
            onRefresh={() => loadPermissions({ isRefresh: true })}
            colors={[HOME_BRAND_RED]}
            tintColor={HOME_BRAND_RED}
          />
        }
      >
        <HomeSectionTitle label="SỰ KIỆN" action="Xem tất cả" />
        <HomeEventBanner
          title={HOME_MEETING_INFO.meetingTitle}
          date={HOME_MEETING_INFO.meetingDate}
          time={HOME_MEETING_INFO.meetingTime}
          venue={HOME_MEETING_INFO.meetingVenue}
          count={HOME_MEETING_INFO.totalShareholders}
          onPress={openMeetingScreen}
        />

        <HomeSectionTitle label="CHỨC NĂNG" />
        {hasNoViewFeatures ? (
          <View style={styles.noPermissionCard}>
            <EmptyState
              iconName="lock-closed-outline"
              title="Chưa có chức năng khả dụng"
              subtitle="Tài khoản hiện tại chưa được cấp quyền xem chức năng nào. Vui lòng liên hệ IT nếu bạn cần thêm quyền truy cập."
              fullHeight={false}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {visibleMenuItems.map((item, index) => (
              <HomeMenuItemCard key={item.id} {...item} index={index} />
            ))}
          </View>
        )}

        <HomeSectionTitle label="THAO TÁC NHANH" />
        <View style={styles.qaCard}>
          <HomeQuickAction
            iconName="qr-code-outline"
            label="Quét QR"
            bg="#F0F4FF"
            color="#3B5BDB"
            onPress={openScanScreen}
          />
          {canViewAssetReports ? (
            <>
              <View style={styles.qaDivider} />
              <HomeQuickAction
                iconName="document-text-outline"
                label="Báo cáo tài sản"
                bg="#F3F0FF"
                color="#7048E8"
                onPress={openReportScreen}
              />
            </>
          ) : null}
          <View style={styles.qaDivider} />
          <HomeQuickAction
            iconName="notifications-outline"
            label="Thông báo"
            bg="#FFF5F5"
            color={HOME_BRAND_RED}
          />
          <View style={styles.qaDivider} />
          <HomeQuickAction
            iconName="settings-outline"
            label="Cài đặt"
            bg="#F0FBF7"
            color="#10B981"
            onPress={openSettingScreen}
          />
        </View>

        <HomeSectionTitle label="TỔNG QUAN" />
        <View style={styles.statsRow}>
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
        </View>
        <View style={styles.statsRow}>
          <HomeStatCard
            value={HOME_ASSET_SUMMARY.totalAssetValue}
            label="Tổng giá trị tài sản"
            sub="Cập nhật hôm nay"
            subColor="#3B5BDB"
            iconName="cash-outline"
            iconBg="#F0F4FF"
            iconColor="#3B5BDB"
            trend="neutral"
          />
        </View>

        <HomeSectionTitle label="HOẠT ĐỘNG GẦN ĐÂY" action="Tất cả" />
        <HomeRecentActivities items={HOME_RECENT_ACTIVITIES} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  grid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 10,
    marginBottom: 14,
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
