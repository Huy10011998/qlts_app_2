import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HomeNavigationProp } from "../../types";
import { useViewPermission } from "../../hooks/useViewPermission";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import HomeMenuItemCard from "./shared/HomeMenuItemCard";
import HomeEventBanner from "./shared/HomeEventBanner";
import HomeStatCard from "./shared/HomeStatCard";
import HomeQuickAction from "./shared/HomeQuickAction";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import HomeRecentActivities from "./shared/HomeRecentActivities";
import { HOME_BG, HOME_BRAND_RED } from "./shared/homeTheme";
import { HOME_MEETING_INFO, HOME_RECENT_ACTIVITIES } from "./shared/homeData";
import { useHomeMenuItems } from "./shared/useHomeMenuItems";

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const tabsNavigation = navigation.getParent() as any;
  const { canView, loaded } = useViewPermission();
  const { menuItems, openMeetingScreen, openScanScreen, openSettingScreen } =
    useHomeMenuItems(navigation, tabsNavigation);

  useReloadPermissionsOnFocus();

  const visibleMenuItems = useMemo(() => {
    if (!loaded) return [];
    return menuItems.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true,
    );
  }, [canView, loaded, menuItems]);

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
      >
        {/* ── Event Banner ── */}
        <HomeSectionTitle label="SỰ KIỆN" action="Xem tất cả" />
        <HomeEventBanner
          title={HOME_MEETING_INFO.meetingTitle}
          date={HOME_MEETING_INFO.meetingDate}
          time={HOME_MEETING_INFO.meetingTime}
          venue={HOME_MEETING_INFO.meetingVenue}
          count={HOME_MEETING_INFO.totalShareholders}
          onPress={openMeetingScreen}
        />

        {/* ── Menu Grid ── */}
        <HomeSectionTitle label="CHỨC NĂNG" />
        <View style={styles.grid}>
          {visibleMenuItems.map((item, index) => (
            <HomeMenuItemCard key={item.id} {...item} index={index} />
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <HomeSectionTitle label="THAO TÁC NHANH" />
        <View style={styles.qaCard}>
          <HomeQuickAction
            iconName="qr-code-outline"
            label="Quét QR"
            bg="#F0F4FF"
            color="#3B5BDB"
            onPress={openScanScreen}
          />
          <View style={styles.qaDivider} />
          <HomeQuickAction
            iconName="document-text-outline"
            label="Báo cáo"
            bg="#F3F0FF"
            color="#7048E8"
          />
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

        {/* ── Stats ── */}
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
            value="1,284"
            label="Tài sản đang quản lý"
            sub="Cập nhật hôm nay"
            subColor="#8A95A3"
            iconName="cube-outline"
            iconBg="#FFF0F0"
            iconColor={HOME_BRAND_RED}
            trend="neutral"
          />
        </View>

        {/* ── Activity ── */}
        <HomeSectionTitle label="HOẠT ĐỘNG GẦN ĐÂY" action="Tất cả" />
        <HomeRecentActivities items={HOME_RECENT_ACTIVITIES} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HOME_BG },
  loadingWrap: {
    flex: 1,
    backgroundColor: HOME_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  grid: {
    flexDirection: "row",
    flexWrap: "nowrap", // always 1 row
    gap: 10,
    marginBottom: 14,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },

  // Quick actions card
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
