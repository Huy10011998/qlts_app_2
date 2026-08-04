import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";

import EmptyState from "../../../components/ui/EmptyState";
import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { HOME_BRAND_RED } from "./homeTheme";
import { makeStyles } from "../HomeScreen.styles";

type MenuScreenContainerProps = React.PropsWithChildren<{
  errorTitle: string;
  hasError: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}>;

/** Vỏ chung cho các màn danh mục: trạng thái lỗi, đang tải, và kéo-để-làm-mới. */
export default function MenuScreenContainer({
  children,
  errorTitle,
  hasError,
  isLoading,
  isRefreshing,
  onRefresh,
}: MenuScreenContainerProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      colors={[HOME_BRAND_RED]}
      tintColor={HOME_BRAND_RED}
    />
  );

  if (hasError) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.centerState,
          { backgroundColor: colors.bg },
        ]}
        refreshControl={refreshControl}
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title={errorTitle}
          subtitle="Vui lòng kiểm tra kết nối hoặc kéo xuống để thử lại."
        />
      </ScrollView>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="small" color={HOME_BRAND_RED} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </View>
  );
}
