import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import {
  AssetDetailsNavigationProp,
  StackRoute,
  mapPropertyResponseToPropertyClass,
} from "../../types/Index";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { RelatedAddItem } from "../add/RelatedAddItem";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/Hooks";
import { resetShouldRefreshList } from "../../store/AssetSlice";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import AssetListSearchBar from "./shared/AssetListSearchBar";
import AssetListSummaryCard from "./shared/AssetListSummaryCard";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import { BRAND_RED } from "./shared/listTheme";
import { sharedAssetListStyles } from "./shared/listStyles";
import { useRelatedAssetListData } from "../../hooks/useRelatedAssetListData";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AssetRelatedList() {
  const route = useRoute<StackRoute<"AssetRelatedList">>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();

  const { nameClass, idRoot, propertyReference, nameClassRoot } = route.params;

  if (!nameClass || !idRoot || !propertyReference) {
    Alert.alert("Lỗi", "Thiếu param bắt buộc");
    return null;
  }

  // ===== CONDITIONS CỐ ĐỊNH =====
  const conditions = useMemo(
    () => [
      {
        property: propertyReference,
        operator: SqlOperator.Equals,
        value: String(idRoot),
        type: TypeProperty.Int,
      },
    ],
    [propertyReference, idRoot],
  );

  // ===== STATE =====
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 600);
  const { can, loaded } = usePermission();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const dispatch = useAppDispatch();
  const {
    data,
    fieldActive,
    fieldShowMobile,
    propertyClass,
    isLoading,
    isLoadingMore,
    isSearching,
    isRefreshingTop,
    total,
    fetchData,
    refreshTop,
    handleLoadMore,
  } = useRelatedAssetListData({
    conditions,
    debouncedSearch,
    nameClass,
    isMounted,
    showAlertIfActive,
  });

  const handlePress = (item: Record<string, any>) => {
    navigation.navigate("AssetRelatedDetails", {
      id: String(item.id),
      field: JSON.stringify(fieldActive),
      nameClass,
      propertyClass,
    });
  };

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );

  // Redux
  useFocusEffect(
    React.useCallback(() => {
      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
      }
    }, [dispatch, fetchData, shouldRefresh]),
  );

  if (
    isLoading &&
    !isRefreshingTop &&
    !isLoadingMore &&
    !isSearching // thêm điều kiện này
  ) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }
  return (
    <View style={styles.container}>
      <AssetListSearchBar
        placeholder="Tìm kiếm dữ liệu liên quan..."
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText="Dữ liệu liên quan"
        summaryText={`Tổng ${total} • Đã tải ${data.length}`}
      />

      {/* LIST */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListCardAsset
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={[BRAND_RED]}
            tintColor={BRAND_RED}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <AssetListSummaryCard
            iconName="link-outline"
            title="Danh sách liên quan"
            subtitle={`${total} kết quả • hiển thị ${data.length}`}
          />
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.listContent,
          data.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="albums-outline"
            title="Không có dữ liệu liên quan"
            subtitle="Thử tìm kiếm bằng từ khóa khác hoặc thêm mới dữ liệu liên kết"
            fullHeight={data.length === 0}
          />
        }
      />

      {loaded && can(nameClass, "Insert") && (
        <RelatedAddItem
          onPress={() =>
            navigation.navigate("AssetAddRelatedItem", {
              field: JSON.stringify(fieldActive),
              nameClass,
              propertyClass: mapPropertyResponseToPropertyClass(propertyClass),
              idRoot,
              nameClassRoot,
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContentEmpty: {
    flexGrow: 1,
  },
  ...sharedAssetListStyles,
});
