import { AppColors, useStyles } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
  UIManager,
  RefreshControl,
  InteractionManager,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import type { QrReviewNavigationProp, StackRoute } from "../../types/index";
import { mapPropertyResponseToPropertyClass } from "../../utils/helpers/propertyClass";
import RecordListSkeleton from "../list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../ui/shouldShowListSkeleton";
import ListCardAsset from "../list/ListCardAsset";
import IsLoading from "../ui/IconLoading";
import { AddItem } from "../add/AddItem";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import {
  resetShouldRefreshList,
  resetUpdatedListItem,
} from "../../store/AssetSlice";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useRelatedAssetListData } from "../../hooks/useRelatedAssetListData";
import AssetListSearchBar from "../assets/shared/AssetListSearchBar";
import AssetListSummaryCard from "../assets/shared/AssetListSummaryCard";
import AssetListEmptyState from "../assets/shared/AssetListEmptyState";
import { BRAND_RED } from "../assets/shared/listTheme";
import { makeSharedAssetListStyles } from "../assets/shared/listStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function QrReview() {
  const styles = useStyles(makeStyles);
  const route = useRoute<StackRoute<"QrReview">>();
  const navigation = useNavigation<QrReviewNavigationProp>();
  const { nameClass, idRoot, propertyReference, nameClassRoot } =
    route.params ?? {};
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
  const [listLayoutVersion, setListLayoutVersion] = useState(0);
  const { can, loaded } = usePermission();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const refreshAndroidListLayout = useCallback(() => {
    if (Platform.OS !== "android") return;

    requestAnimationFrame(() => {
      setListLayoutVersion((version) => version + 1);
    });
  }, []);

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
    loadErrorMessage,
    total,
    fetchData,
    mergeItemById,
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
      idRoot,
      propertyReference,
      nameClassRoot,
      returnTo: "qrReview",
    });
  };

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );
  const updatedListItem = useSelector(
    (state: RootState) => state.asset.updatedListItem,
  );

  useFocusEffect(
    React.useCallback(() => {
      const interaction = InteractionManager.runAfterInteractions(() => {
        refreshAndroidListLayout();
      });

      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
        // Nạp lại cả danh sách đã bao trùm việc merge một item, nên phải dọn luôn
        // cờ merge của chính class này. Để nó treo lại thì lần focus sau sẽ merge
        // một bản ghi có thể đã bị xoá và ăn 404.
        if (updatedListItem?.nameClass === nameClass) {
          dispatch(resetUpdatedListItem());
        }
      } else if (updatedListItem && updatedListItem.nameClass === nameClass) {
        mergeItemById(updatedListItem.id);
        dispatch(resetUpdatedListItem());
      }

      return () => {
        interaction.cancel();
      };
    }, [
      dispatch,
      fetchData,
      mergeItemById,
      nameClass,
      refreshAndroidListLayout,
      shouldRefresh,
      updatedListItem,
    ]),
  );

  useEffect(() => {
    if (!isSearching) {
      refreshAndroidListLayout();
    }
  }, [debouncedSearch, isSearching, refreshAndroidListLayout]);

  if (!hasRequiredParams) {
    Alert.alert("Lỗi", "Thiếu param bắt buộc");
    return null;
  }

  if (
    shouldShowListSkeleton({
      isFetching: isLoading || isLoadingMore,
      isEmpty: data.length === 0,
      isRefreshing: isRefreshingTop,
      isSearching,
    })
  ) {
    return <RecordListSkeleton hasSearchBar hasSummaryCard />;
  }

  if (loadErrorMessage) {
    return (
      <View style={styles.emptyStateRoot}>
        <AssetListEmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu QR"
          subtitle={loadErrorMessage}
        />
      </View>
    );
  }

  const isEmpty = data.length === 0;
  // Một điều kiện duy nhất cho cả nút và khoảng chừa ở đáy danh sách.
  const showAddFab = Boolean(loaded && can(nameClass, "Insert"));

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

      {!isEmpty ? (
        <AssetListSummaryCard
          iconName="qr-code-outline"
          title="Danh sách sau quét"
          subtitle={`${total} kết quả • hiển thị ${data.length}`}
        />
      ) : null}

      <View style={styles.listWrap}>
        <FlatList
          key={`qr-review-list-${nameClass || "default"}-${listLayoutVersion}`}
          style={styles.list}
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
          removeClippedSubviews={Platform.OS === "android"}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
          ListHeaderComponent={null}
          stickyHeaderIndices={[]}
          contentContainerStyle={[
            styles.listContent,
            showAddFab && !isEmpty && styles.listContentWithFab,
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
      </View>

      {showAddFab && (
        <AddItem
          nameClass={nameClass}
          onPress={() =>
            navigation.navigate("AssetAddRelatedItem", {
              field: JSON.stringify(fieldActive),
              nameClass,
              propertyClass: mapPropertyResponseToPropertyClass(propertyClass),
              idRoot,
              nameClassRoot,
              propertyReference,
              returnTo: "qrReview",
            })
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    listWrap: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContentEmpty: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    emptyStateRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    ...makeSharedAssetListStyles(c),
  });
