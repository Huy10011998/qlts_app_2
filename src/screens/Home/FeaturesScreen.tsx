import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { HomeNavigationProp } from "../../types";
import EmptyState from "../../components/ui/EmptyState";
import SearchBar from "../../components/ui/SearchBar";
import { removeVietnameseTones } from "../../utils/helpers/string";
import { useAppColors, useStyles } from "../../utils/helpers/colors";
import FeatureTile, { type FeatureTileGroup } from "./shared/FeatureTile";
import { HOME_BRAND_RED } from "./shared/homeTheme";
import { useMenuScreenData } from "./shared/useMenuScreenData";
import { makeFeatureStyles } from "./FeaturesScreen.styles";

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

  // Ô tìm kiếm nằm ngoài ScrollView: danh mục dài vài chục ô, kéo xuống giữa
  // danh sách vẫn phải gõ lọc được ngay.
  const searchBar = (
    <View style={styles.searchWrap}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm kiếm chức năng"
      />
    </View>
  );
  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={refresh}
      colors={[HOME_BRAND_RED]}
      tintColor={HOME_BRAND_RED}
    />
  );

  const renderSection = (
    title: string,
    items: { id: string; iconName: string; label: string; onPress?: () => void; notificationCount?: number }[],
    group: FeatureTileGroup,
  ) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            {title}
          </Text>
        </View>
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
            subtitle="Vui lòng kiểm tra kết nối hoặc kéo xuống để thử lại."
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={HOME_BRAND_RED} />
        </View>
      ) : (
        <>
          {searchBar}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={refreshControl}
          >
            {renderSection("Tiện ích", featureItems, "feature")}
            {renderSection("Phương tiện", vehicleItems, "vehicle")}
            {renderSection("Báo cáo", reportItems, "report")}

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
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default FeaturesScreen;
