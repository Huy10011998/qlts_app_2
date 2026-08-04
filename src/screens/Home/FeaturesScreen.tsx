import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { HomeNavigationProp } from "../../types";
import EmptyState from "../../components/ui/EmptyState";
import {
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import HomeMenuItemCard from "./shared/HomeMenuItemCard";
import HomeReportCard from "./shared/HomeReportCard";
import HomeSectionTitle from "./shared/HomeSectionTitle";
import MenuGrid from "./shared/MenuGrid";
import MenuScreenContainer from "./shared/MenuScreenContainer";
import {
  MENU_FEATURE_COLUMNS,
  MENU_REPORT_COLUMNS,
  useMenuScreenData,
} from "./shared/useMenuScreenData";
import { makeStyles } from "./HomeScreen.styles";

/**
 * Danh mục đầy đủ của tab Chức năng: chức năng, phương tiện và báo cáo.
 *
 * Trang chủ chỉ giữ hàng shortcut do user ghim; việc chọn ghim mục nào nằm ở
 * nút "Tuỳ chỉnh" trên chính Trang chủ. Ở đây card chỉ để mở chức năng — trước
 * đây mỗi card có thêm nút +, nhưng khi đã có một bảng liệt kê đủ ba nhóm thì
 * hai đường vào cùng một danh sách ghim chỉ làm lưới rối và dễ bấm nhầm.
 *
 * Phương tiện từng là một tab riêng; gom về đây vì danh sách phụ thuộc
 * GET_MENU_ACTIVE nên thường chỉ có vài ô — không đủ cho một tab, và một tab
 * rỗng thì không giải thích được vì sao rỗng. Vẫn tách section riêng để thứ tự
 * card không đổi khi quyền phương tiện bật/tắt.
 */
const FeaturesScreen: React.FC = () => {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const navigation = useNavigation<HomeNavigationProp>();
  const {
    featureCardWidth,
    hasError,
    isLoading,
    isRefreshing,
    refresh,
    reportActions,
    reportCardWidth,
    visibleFeatureItems,
    visibleVehicleItems,
  } = useMenuScreenData(navigation);

  return (
    <MenuScreenContainer
      errorTitle="Không thể tải danh mục chức năng"
      hasError={hasError}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
    >
      <HomeSectionTitle label="CHỨC NĂNG" />
      {visibleFeatureItems.length === 0 ? (
        <View
          style={[
            styles.noPermissionCard,
            {
              backgroundColor: colors.surface,
              borderColor: hairlineBorderColor,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <EmptyState
            iconName="lock-closed-outline"
            title="Chưa có chức năng khả dụng"
            subtitle="Tài khoản hiện tại chưa được cấp quyền xem chức năng nào. Vui lòng liên hệ IT nếu bạn cần thêm quyền truy cập."
            fullHeight={false}
          />
        </View>
      ) : (
        <MenuGrid
          keyPrefix="feature"
          items={visibleFeatureItems}
          columns={MENU_FEATURE_COLUMNS}
          cardWidth={featureCardWidth}
          renderCard={(item, index) => (
            <HomeMenuItemCard
              {...item}
              index={index}
              fixedHeight
            />
          )}
        />
      )}

      {visibleVehicleItems.length > 0 ? (
        <>
          <HomeSectionTitle label="PHƯƠNG TIỆN" />
          <MenuGrid
            keyPrefix="vehicle"
            items={visibleVehicleItems}
            columns={MENU_FEATURE_COLUMNS}
            cardWidth={featureCardWidth}
            renderCard={(item, index) => (
              <HomeMenuItemCard
                {...item}
                index={index}
                fixedHeight
              />
            )}
          />
        </>
      ) : null}

      {reportActions.length > 0 ? (
        <>
          <HomeSectionTitle label="BÁO CÁO" />
          <MenuGrid
            keyPrefix="report"
            items={reportActions}
            columns={MENU_REPORT_COLUMNS}
            cardWidth={reportCardWidth}
            itemStyle={styles.reportGridItem}
            renderCard={(item, index) => (
              <HomeReportCard
                index={index}
                label={item.label}
                onPress={item.onPress}
              />
            )}
          />
        </>
      ) : null}
    </MenuScreenContainer>
  );
};

export default FeaturesScreen;
