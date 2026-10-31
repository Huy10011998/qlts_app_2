import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { HomeNavigationProp } from "../../types";
import EmptyState from "../../components/ui/EmptyState";
import TabBarSpacer from "../../navigation/shared/TabBarSpacer";
import { useHideTabBarOnScroll } from "../../navigation/shared/tabBarAutoHide";
import SearchBar from "../../components/ui/SearchBar";
import HeaderSearchReveal from "../../components/ui/HeaderSearchReveal";
import { useHeaderSearch } from "../../hooks/useHeaderSearch";
import { removeVietnameseTones } from "../../utils/helpers/string";
import { useAppColors, useStyles } from "../../utils/helpers/colors";
import FeatureTile, { type FeatureTileGroup } from "./shared/FeatureTile";
import FeaturesScreenSkeleton from "./shared/FeaturesScreenSkeleton";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import { HOME_BRAND_RED } from "./shared/homeTheme";
import { getHomeCardChrome } from "./shared/homeBlockTone";
import { useMenuScreenData } from "./shared/useMenuScreenData";
import { useStoredHomeBlockList } from "./shared/useStoredHomeBlockList";
import { FEATURE_SECTIONS, makeFeatureStyles } from "./FeaturesScreen.styles";

/**
 * Danh mục đầy đủ của tab Chức năng: chức năng, phương tiện và báo cáo.
 *
 * Trang chủ chỉ giữ hàng shortcut do user ghim; việc chọn ghim mục nào nằm ở
 * nút "Tuỳ chỉnh" trên chính Trang chủ. Ở đây ô chỉ để mở chức năng — trước
 * đây mỗi ô có thêm nút +, nhưng khi đã có một bảng liệt kê đủ ba nhóm thì
 * hai đường vào cùng một danh sách ghim chỉ làm lưới rối và dễ bấm nhầm.
 *
 * Phương tiện từng là một tab riêng; gom về đây vì danh sách phụ thuộc
 * GET_MENU_ACTIVE nên thường chỉ có vài ô — không đủ cho một tab, và một tab
 * rỗng thì không giải thích được vì sao rỗng. Vẫn tách nhóm riêng để thứ tự ô
 * không đổi khi quyền phương tiện bật/tắt.
 */
/** Nhóm đang thu gọn, lưu theo từng tài khoản như khối thu gọn của Trang chủ. */
const FEATURE_COLLAPSED_GROUPS_KEY = "@features:collapsedGroups";
const FEATURE_TILE_GROUPS = new Set<string>(["feature", "vehicle", "report"]);
const isFeatureTileGroup = (key: string): key is FeatureTileGroup =>
  FEATURE_TILE_GROUPS.has(key);

const FeaturesScreen: React.FC = () => {
  const styles = useStyles(makeFeatureStyles);
  const colors = useAppColors();
  const navigation = useNavigation<HomeNavigationProp>();
  const {
    hasError,
    isLoading,
    isRefreshing,
    refresh,
    reportActions,
    visibleFeatureItems,
    visibleVehicleItems,
  } = useMenuScreenData(navigation);
  const [query, setQuery] = useState("");
  const search = useHeaderSearch({ query, onClear: () => setQuery("") });
  // Bấm (hoặc đè giữ) nhãn màu để gập nhóm, như khối Trang chủ.
  const {
    keys: collapsedGroups,
    setIncluded: setGroupCollapsed,
    setManyIncluded: setGroupsCollapsed,
    isLoading: isCollapsedLoading,
  } = useStoredHomeBlockList(FEATURE_COLLAPSED_GROUPS_KEY, isFeatureTileGroup);
  const collapsedGroupSet = useMemo(
    () => new Set(collapsedGroups),
    [collapsedGroups],
  );
  // Thanh tab tự ẩn khi đọc xuống, hiện lại khi vuốt ngược lên (như Trang chủ).
  const hideTabBarOnScroll = useHideTabBarOnScroll();

  // Gõ không dấu vẫn ra kết quả: tên chức năng đều là tiếng Việt có dấu, bắt
  // người dùng gõ đúng dấu thì ô tìm kiếm gần như vô dụng trên bàn phím ngoài.
  const keyword = removeVietnameseTones(query.trim());
  const filterByKeyword = <T extends { label: string }>(items: T[]) =>
    keyword
      ? items.filter((item) =>
          removeVietnameseTones(item.label).includes(keyword),
        )
      : items;

  const featureItems = filterByKeyword(visibleFeatureItems);
  const vehicleItems = filterByKeyword(visibleVehicleItems);
  const reportItems = filterByKeyword(reportActions);
  const hasAnyItem =
    visibleFeatureItems.length +
      visibleVehicleItems.length +
      reportActions.length >
    0;
  const hasAnyMatch =
    featureItems.length + vehicleItems.length + reportItems.length > 0;

  // Ô tìm kiếm ẩn sau nút kính lúp trên header; mở thì nằm ngoài ScrollView:
  // danh mục dài vài chục ô, kéo xuống giữa danh sách vẫn gõ lọc được ngay.
  const searchBar = (
    <HeaderSearchReveal open={search.open}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm chức năng"
          autoFocus
          onClose={search.close}
        />
      </View>
    </HeaderSearchReveal>
  );
  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refresh}
      colors={[HOME_BRAND_RED]}
      tintColor={HOME_BRAND_RED}
    />
  );

  // Viền thẻ nhóm cùng màu icon trong nhóm (đỏ · xanh · tím, như `FeatureTile`),
  // giống card trên Trang chủ viền theo màu của chính nó.
  const sectionColorByGroup: Record<FeatureTileGroup, string> = {
    feature: colors.red,
    vehicle: colors.sky,
    report: colors.violet,
  };

  // Đè giữ nhãn nhóm nào cũng được: còn nhóm mở thì gập hết, đã gập hết thì mở
  // hết — như khối Trang chủ. Chỉ các nhóm đang có ô.
  const shownGroups = (
    [
      ["feature", featureItems],
      ["vehicle", vehicleItems],
      ["report", reportItems],
    ] as const
  )
    .filter(([, items]) => items.length > 0)
    .map(([group]) => group);
  const toggleAllGroupsCollapsed = () => {
    const allCollapsed = shownGroups.every((group) =>
      collapsedGroupSet.has(group),
    );
    setGroupsCollapsed([...shownGroups], !allCollapsed);
  };

  const renderSection = (
    items: { id: string; iconName: string; label: string; onPress?: () => void; notificationCount?: number }[],
    group: FeatureTileGroup,
  ) => {
    if (items.length === 0) return null;

    const sectionColor = sectionColorByGroup[group];
    const section = FEATURE_SECTIONS[group];
    // Đang tìm thì mở hết, kết quả không được nằm khuất trong nhóm đang gập;
    // xoá chữ là nhóm về lại như cũ (danh sách lưu máy không đổi).
    const isSearching = Boolean(keyword);
    const collapsed = !isSearching && collapsedGroupSet.has(group);

    return (
      <View>
        {/* Nhãn màu ngoài thẻ như Trang chủ mẫu C. Đang lọc thì số mục là số
            khớp từ khoá. */}
        <HomeSectionTitle
          label={section.label}
          tone={section.tone}
          iconName={section.iconName}
          note={`${items.length} mục`}
          collapsed={collapsed}
          onToggleCollapsed={
            isSearching ? undefined : () => setGroupCollapsed(group, !collapsed)
          }
          onLongPress={isSearching ? undefined : toggleAllGroupsCollapsed}
        />
        {collapsed ? null : (
          <View
            style={[
              styles.sectionCard,
              getHomeCardChrome({
                borderColor: sectionColor,
                shadowColor: colors.shadow,
                accent: sectionColor,
              }),
            ]}
          >
            <View style={styles.sectionGrid}>
              {items.map((item) => (
                <FeatureTile
                  key={`${group}-${item.id}`}
                  iconName={item.iconName}
                  label={item.label}
                  notificationCount={item.notificationCount}
                  group={group}
                  onPress={item.onPress}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (hasError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.centerState}
          refreshControl={refreshControl}
        >
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải danh mục chức năng"
            subtitle="Vui lòng kiểm tra kết nối rồi bấm Thử lại."
            // Kéo xuống vẫn làm mới được, nhưng ít ai đoán ra trên một màn lỗi.
            actionLabel="Thử lại"
            onActionPress={refresh}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Ô tìm kiếm không đợi dữ liệu nào nên dựng luôn, cả lúc chờ lẫn lúc
          xong — nằm ngoài nhánh thì nó không bị tháo ra dựng lại. */}
      {searchBar}

      {/* Chờ cả danh sách nhóm gập đọc từ máy: vẽ trước thì nhóm đã gập loé
          mở ra rồi mới đóng. */}
      {isLoading || isCollapsedLoading ? (
        <FeaturesScreenSkeleton
          collapsedGroups={isCollapsedLoading ? undefined : collapsedGroups}
        />
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onScroll={hideTabBarOnScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={refreshControl}
          >
            {renderSection(featureItems, "feature")}
            {renderSection(vehicleItems, "vehicle")}
            {renderSection(reportItems, "report")}

            {hasAnyMatch ? null : (
              <View style={styles.emptyCard}>
                {hasAnyItem ? (
                  <EmptyState
                    iconName="search-outline"
                    title="Không tìm thấy chức năng"
                    subtitle={`Không có chức năng nào khớp với "${query.trim()}". Thử một từ khoá ngắn hơn.`}
                    fullHeight={false}
                  />
                ) : (
                  <EmptyState
                    iconName="lock-closed-outline"
                    title="Chưa có chức năng khả dụng"
                    subtitle="Tài khoản hiện tại chưa được cấp quyền xem chức năng nào. Vui lòng liên hệ IT nếu bạn cần thêm quyền truy cập."
                    fullHeight={false}
                  />
                )}
              </View>
            )}
            <TabBarSpacer />
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default FeaturesScreen;
