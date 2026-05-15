import React, { useMemo, useState } from "react";
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
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
  mapPropertyResponseToPropertyClass,
  QrReviewNavigationProp,
  StackRoute,
} from "../../types/Index";
import ListCardAsset from "../list/ListCardAsset";
import IsLoading from "../ui/IconLoading";
import { AddItem } from "../add/AddItem";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/Hooks";
import { resetShouldRefreshList } from "../../store/AssetSlice";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useRelatedAssetListData } from "../../hooks/useRelatedAssetListData";
import AssetListSearchBar from "../assets/shared/AssetListSearchBar";
import AssetListSummaryCard from "../assets/shared/AssetListSummaryCard";
import AssetListEmptyState from "../assets/shared/AssetListEmptyState";
import { BRAND_RED } from "../assets/shared/listTheme";
import { sharedAssetListStyles } from "../assets/shared/listStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function QrReview() {
  const route = useRoute<StackRoute<"QrReview">>();
  const navigation = useNavigation<QrReviewNavigationProp>();
  const {
    nameClass,
    idRoot,
    propertyReference,
    nameClassRoot,
  } = route.params ?? {};
  const hasRequiredParams = !!nameClass && !!idRoot && !!propertyReference;

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
    enabled: hasRequiredParams,
    nameClass,
    isMounted,
    showAlertIfActive,
  });

  const handlePress = (item: Record<string, any>) => {
    navigation.navigate("AssetRelatedDetails", {
      id: String(item.id),
      field: JSON.stringify(fieldActive),
      nameClass,
    });
  };

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );

  useFocusEffect(
    React.useCallback(() => {
      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
      }
    }, [dispatch, fetchData, shouldRefresh]),
  );

  if (!hasRequiredParams) {
    Alert.alert("Lỗi", "Thiếu param bắt buộc");
    return null;
  }

  if (
    isLoading &&
    !isRefreshingTop &&
    !isLoadingMore &&
    !isSearching
  ) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }

  const isEmpty = data.length === 0;

  return (
    <View style={styles.container}>
      <AssetListSearchBar
        placeholder="Tìm kiếm dữ liệu quét..."
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText="Kết quả QR"
        summaryText={`Tổng ${total} • Đã tải ${data.length}`}
      />

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
          isEmpty ? null : (
            <AssetListSummaryCard
              iconName="qr-code-outline"
              title="Danh sách sau quét"
              subtitle={`${total} kết quả • hiển thị ${data.length}`}
            />
          )
        }
        stickyHeaderIndices={isEmpty ? [] : [0]}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="albums-outline"
            title="Không có dữ liệu"
            subtitle="Chưa có bản ghi phù hợp với bộ lọc hiện tại"
          />
        }
      />

      {loaded && can(nameClass, "Insert") && (
        <AddItem
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
    paddingTop: 0,
    paddingBottom: 0,
  },
  ...sharedAssetListStyles,
});
