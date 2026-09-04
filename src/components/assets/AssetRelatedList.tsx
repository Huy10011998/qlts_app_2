import { AppColors, useStyles } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useState } from "react";
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
import type { AssetDetailsNavigationProp, StackRoute } from "../../types/index";
import { mapPropertyResponseToPropertyClass } from "../../utils/helpers/propertyClass";
import RecordListSkeleton from "../../components/list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../../components/ui/shouldShowListSkeleton";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { AddItem } from "../add/AddItem";
import { useDebounce } from "../../hooks/useDebounce";
import { useParentValuePairs } from "../../hooks/parentValue/useParentValuePairs";
import { usePermission } from "../../hooks/usePermission";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import {
  resetShouldRefreshList,
  resetUpdatedListItem,
} from "../../store/AssetSlice";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import AssetListSearchBar from "./shared/AssetListSearchBar";
import AssetListSummaryCard from "./shared/AssetListSummaryCard";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import { BRAND_RED } from "./shared/listTheme";
import { makeSharedAssetListStyles } from "./shared/listStyles";
import { useRelatedAssetListData } from "../../hooks/useRelatedAssetListData";
import { useHeaderRecordPill } from "./shared/useHeaderRecordPill";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AssetRelatedList() {
  const styles = useStyles(makeStyles);
  const route = useRoute<StackRoute<"AssetRelatedList">>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();
  const {
    nameClass,
    idRoot,
    propertyReference,
    nameClassRoot,
    rootRecordLabel,
    groupMenuId,
    viewPermission,
    assetTitleHeader,
  } = route.params ?? {};
  const hasRequiredParams = !!nameClass && !!idRoot && !!propertyReference;

  /* Lọc bằng TRỌN bộ cặp của parent-value, không chỉ khoá ngoại tới cha: bộ cặp
     còn mang điều kiện phân loại (LinhKien của MayTinh phải kèm
     ID_LoaiThietBiCNTT = 7, không thì lẫn linh kiện của Server). */
  /* Kéo làm mới thì nạp lại cả bộ cặp: sửa cột cấp cha của bản ghi cha rồi mà
     cache cũ còn thì danh sách lọc sai cho tới khi tắt app. */
  const [parentValueToken, setParentValueToken] = useState(0);

  const {
    conditions,
    isReady: isParentValueReady,
    isLoading: isLoadingParentValue,
  } = useParentValuePairs({
    idRoot,
    nameClass,
    nameClassRoot,
    propertyReference,
    enabled: hasRequiredParams,
    reloadToken: parentValueToken,
  });

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
    /* Chờ chốt điều kiện lọc mới gọi get-list: gọi trước với điều kiện rộng rồi
       gọi lại là nháy dữ liệu của bản ghi cha khác. */
    enabled: hasRequiredParams && isParentValueReady,
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
      idRoot,
      propertyReference,
      nameClassRoot,
      rootRecordLabel,
      titleHeader: route.params?.titleHeader,
      groupMenuId,
      viewPermission,
      assetTitleHeader,
    });
  };

  // Pill mã bản ghi gốc ở góc phải header, bấm là mở lại bản ghi cha.
  useHeaderRecordPill({
    label: rootRecordLabel,
    recordId: idRoot,
    nameClass: nameClassRoot,
    groupMenuId,
    viewPermission,
    assetTitleHeader,
  });

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
      /* Lúc chờ parent-value, `useRelatedAssetListData` đang ở nhánh
         `!enabled` nên tự set `isLoading = false` — không OR thêm cờ này thì
         màn loé "Không có dữ liệu" rồi mới ra danh sách. */
      isFetching: isLoading || isLoadingMore || isLoadingParentValue,
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
          title="Không thể tải dữ liệu liên quan"
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
        placeholder="Tìm kiếm dữ liệu liên quan..."
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText="Dữ liệu liên quan"
        summaryText={`Tổng ${total} • Đã tải ${data.length}`}
      />

      {!isEmpty ? (
        <AssetListSummaryCard
          iconName="link-outline"
          title="Danh sách liên quan"
          subtitle={`${total} kết quả • hiển thị ${data.length}`}
        />
      ) : null}

      <View style={styles.listWrap}>
        <FlatList
          key={`asset-related-list-${
            nameClass || "default"
          }-${listLayoutVersion}`}
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
              onRefresh={() => {
                setParentValueToken((token) => token + 1);
                refreshTop();
              }}
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
              title="Không có dữ liệu liên quan"
              subtitle="Thử tìm kiếm bằng từ khóa khác hoặc thêm mới dữ liệu liên kết"
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
              rootRecordLabel,
              propertyReference,
              titleHeader: route.params?.titleHeader,
              returnTo: "assetRelatedList",
              groupMenuId,
              viewPermission,
              assetTitleHeader,
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
