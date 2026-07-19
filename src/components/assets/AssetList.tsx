import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type {
  Field,
  PropertyResponse,
  StackNavigation,
  TreeNode,
} from "../../types/index";
import {
  getDetails,
  getFieldActive,
  getList,
  getPropertyClass,
  getBuildTree,
} from "../../services";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { useDebounce } from "../../hooks/useDebounce";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AddItem } from "../add/AddItem";
import { useParams } from "../../hooks/useParams";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import {
  resetSelectedTreeNode,
  resetShouldRefreshList,
  resetUpdatedListItem,
  setSelectedTreeNode,
} from "../../store/AssetSlice";
import { error } from "../../utils/Logger";
import { usePermission } from "../../hooks/usePermission";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useAppDispatch } from "../../store/hooks";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/callApi";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import SlideInSidePanel from "../shared/SlideInSidePanel";
import AssetListSearchBar from "./shared/AssetListSearchBar";
import AssetListSummaryCard from "./shared/AssetListSummaryCard";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import AssetTreeNodeItem from "./shared/AssetTreeNodeItem";
import {
  AssetFilterCondition,
  buildTree,
  getConditionsFromNode,
} from "./shared/treeHelpers";
import { BRAND_RED } from "./shared/listTheme";
import { sharedAssetListStyles } from "./shared/listStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

function AssetListMenuButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerButton}>
      <Ionicons name="menu" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

export default function AssetList() {
  const navigation = useNavigation<StackNavigation<"AssetList">>();
  const {
    nameClass,
    titleHeader,
    groupMenuId,
    viewPermission,
    assetTitleHeader,
  } = useParams();
  const [assetItems, setAssetItems] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");

  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchText, 600);
  const pageSize = 20;
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeErrorMessage, setTreeErrorMessage] = useState<string | null>(null);
  const [conditions, setConditions] = useState<AssetFilterCondition[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const dispatch = useAppDispatch();
  const fieldActiveRef = useRef<Field[]>([]);
  const propertyClassRef = useRef<PropertyResponse | undefined>(undefined);
  const skipSizeRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const [listLayoutVersion, setListLayoutVersion] = useState(0);

  const refreshAndroidListLayout = useCallback(() => {
    if (Platform.OS !== "android") return;

    requestAnimationFrame(() => {
      setListLayoutVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    dispatch(resetSelectedTreeNode());
  }, [dispatch]);

  useReloadPermissionsOnFocus();

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );
  const updatedListItem = useSelector(
    (state: RootState) => state.asset.updatedListItem,
  );

  // Chỉ fetch lại đúng item vừa sửa rồi merge vào list tại chỗ,
  // giữ nguyên scroll, các trang đã load-more, search và bộ lọc.
  const mergeUpdatedItem = useCallback(
    async (itemId: string) => {
      if (!nameClass) return;
      try {
        const response = await getDetails(nameClass, itemId);
        const freshItem = response?.data;
        if (!freshItem || !isMounted()) return;

        setAssetItems((prev) =>
          prev.map((it) =>
            String(it.id) === itemId ? { ...it, ...freshItem } : it,
          ),
        );
      } catch (e) {
        error("Lỗi cập nhật item trong list:", e);
      }
    },
    [isMounted, nameClass],
  );
  const { can, loaded } = usePermission();

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    skipSizeRef.current = 0;

    await fetchData(false, { isRefresh: true });

    setIsRefreshingTop(false);
  };

  const treeLoadedRef = useRef(false);
  const loadTreeMenu = useCallback(async () => {
    if (!nameClass) return;
    if (loadErrorMessage) {
      setTreeData([]);
      treeLoadedRef.current = false;
      setTreeErrorMessage(
        "Vui lòng kiểm tra kết nối mạng rồi thử mở lại danh mục.",
      );
      return;
    }
    if (treeLoadedRef.current) return;

    try {
      setLoadingTree(true);
      setTreeErrorMessage(null);
      const res = await getBuildTree(nameClass);
      const nextTreeData = buildTree(res.data || []);
      setTreeData(nextTreeData);
      treeLoadedRef.current = true;
    } catch (e) {
      error("Lỗi load tree:", e);
      setTreeData([]);
      treeLoadedRef.current = false;
      setTreeErrorMessage(
        "Không thể tải danh mục. Vui lòng kiểm tra kết nối mạng.",
      );
    } finally {
      setLoadingTree(false);
    }
  }, [loadErrorMessage, nameClass]);

  const {
    closePanel: closeMenu,
    togglePanel,
    translateAnim: slideAnim,
    visible: menuVisible,
  } = useSlideInPanel({
    initialOffset: MENU_WIDTH,
    onBeforeOpen: loadTreeMenu,
  });

  const toggleMenu = useCallback(() => {
    if (!propertyClass?.isBuildTree) return;
    togglePanel();
  }, [propertyClass?.isBuildTree, togglePanel]);

  const renderHeaderRight = useCallback(
    () =>
      propertyClass?.isBuildTree ? (
        <AssetListMenuButton onPress={toggleMenu} />
      ) : null,
    [propertyClass?.isBuildTree, toggleMenu],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (!nameClass) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActiveRef.current.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClassRef.current);

      if (!isLoadMore && !isRefresh && isFirstLoadRef.current) {
        setIsLoading(true);
      }

      try {
        if (shouldReloadFieldConfig) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];

          fieldActiveRef.current = activeFields;
          setFieldActive(activeFields);

          setFieldShowMobile(
            activeFields.filter((f: any) => Boolean(Number(f.isShowMobile))),
          );
        }

        if (shouldReloadPropertyClass && nameClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          const nextPropertyClass = responsePropertyClass?.data;

          propertyClassRef.current = nextPropertyClass;
          setPropertyClass(nextPropertyClass);
        }

        const currentSkip = isLoadMore ? skipSizeRef.current : 0;

        const response = await getList(
          nameClass,
          "id desc",
          pageSize,
          currentSkip,
          debouncedSearch,
          conditions,
          [],
        );

        const newItems: Record<string, any>[] = response?.data?.items || [];
        const totalItems = response?.data?.totalCount || 0;

        if (Platform.OS !== "android") {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }

        if (isLoadMore) {
          const nextSkip = currentSkip + pageSize;

          setAssetItems((prev) => [...prev, ...newItems]);
          skipSizeRef.current = nextSkip;
        } else {
          skipSizeRef.current = pageSize;
          setAssetItems(newItems);
          refreshAndroidListLayout();
        }

        setTotal(totalItems);
        setLoadErrorMessage(null);
      } catch (e) {
        error("API error:", e);
        if (isLoadMore && !isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải thêm dữ liệu.");
        }
        if (!isLoadMore) {
          setAssetItems([]);
          setSelectedNode(null);
          dispatch(resetSelectedTreeNode());
          setTreeData([]);
          treeLoadedRef.current = false;
          setTreeErrorMessage(
            "Vui lòng kiểm tra kết nối mạng rồi thử mở lại danh mục.",
          );
          setLoadErrorMessage(
            "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại.",
          );
        }
      } finally {
        if (isMounted()) {
          isFirstLoadRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [
      conditions,
      debouncedSearch,
      dispatch,
      refreshAndroidListLayout,
      isMounted,
      nameClass,
      showAlertIfActive,
    ],
  );

  useFocusEffect(
    React.useCallback(() => {
      const interaction = InteractionManager.runAfterInteractions(() => {
        refreshAndroidListLayout();
      });

      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
      } else if (updatedListItem && updatedListItem.nameClass === nameClass) {
        mergeUpdatedItem(updatedListItem.id);
        dispatch(resetUpdatedListItem());
      }

      return () => {
        interaction.cancel();
      };
    }, [
      dispatch,
      fetchData,
      mergeUpdatedItem,
      nameClass,
      refreshAndroidListLayout,
      shouldRefresh,
      updatedListItem,
    ]),
  );

  useNetworkAwareReload(fetchData, {
    hasError: Boolean(loadErrorMessage),
    onOffline: () => {
      setAssetItems([]);
      setSelectedNode(null);
      dispatch(resetSelectedTreeNode());
      setTreeData([]);
      treeLoadedRef.current = false;
      setTreeErrorMessage(
        "Vui lòng kiểm tra kết nối mạng rồi thử mở lại danh mục.",
      );
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại.",
      );
    },
  });

  const handleLoadMore = () => {
    if (assetItems.length < total && !isLoadingMore && !isLoading) {
      setIsLoadingMore(true);
      fetchData(true);
    }
  };

  const handlePress = useCallback(
    async (item: Record<string, any>) => {
      try {
        navigation.navigate("AssetDetails", {
          id: String(item.id),
          field: JSON.stringify(fieldActive),
          nameClass,
          titleHeader,
          propertyClass,
          groupMenuId,
          viewPermission,
          assetTitleHeader,
        });
      } catch (e) {
        error(e);
        showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      }
    },
    [
      fieldActive,
      nameClass,
      navigation,
      propertyClass,
      showAlertIfActive,
      titleHeader,
      groupMenuId,
      viewPermission,
      assetTitleHeader,
    ],
  );

  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);
    dispatch(
      setSelectedTreeNode({
        value: node.value ?? null,
        property: node.property ?? null,
        text: node.text ?? null,
      }),
    );
    const newConditions = getConditionsFromNode(node);
    setConditions(newConditions);
    closeMenu();
  };

  useEffect(() => {
    if (!nameClass) return;

    const isSearch = debouncedSearch.trim().length > 0;

    if (isSearch) {
      setIsSearching(true);
    }

    skipSizeRef.current = 0;

    fetchData(false).finally(() => {
      if (isSearch) {
        setIsSearching(false);
      }
    });
  }, [conditions, debouncedSearch, fetchData, nameClass]);

  const renderItem = useCallback(
    ({ item }: { item: Record<string, any> }) => (
      <ListCardAsset
        item={item}
        fields={fieldShowMobile.length ? fieldShowMobile : fieldActive}
        icon={propertyClass?.iconMobile || ""}
        onPress={() => handlePress(item)}
      />
    ),
    [fieldActive, fieldShowMobile, handlePress, propertyClass],
  );

  const renderTreePanel = () => (
    <SlideInSidePanel
      bodyStyle={styles.menuScrollContent}
      onClose={closeMenu}
      subtitle="Chọn nhóm để lọc tài sản"
      title="Danh mục"
      translateX={slideAnim}
      visible={menuVisible}
      width={MENU_WIDTH}
    >
      {loadingTree && <IsLoading size="small" />}
      {!loadingTree && treeErrorMessage ? (
        <AssetListEmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải danh mục"
          subtitle={treeErrorMessage}
        />
      ) : null}
      {!loadingTree && treeData.length > 0
        ? treeData.map((node) => (
            <AssetTreeNodeItem
              key={node.index}
              node={node}
              onSelect={handleSelectNode}
              expandAll={true}
              selectedNode={selectedNode}
            />
          ))
        : null}
      {!loadingTree && !treeErrorMessage && treeData.length === 0 ? (
        <AssetListEmptyState
          iconName="folder-open-outline"
          title="Chưa có danh mục"
          subtitle="Danh mục cây con sẽ hiển thị tại đây khi có dữ liệu."
        />
      ) : null}
    </SlideInSidePanel>
  );

  if (isLoading && !isRefreshingTop && !isLoadingMore && !isSearching) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }

  if (loadErrorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateRoot}>
          <AssetListEmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải danh sách tài sản"
            subtitle={loadErrorMessage}
          />
        </View>
        {renderTreePanel()}
      </View>
    );
  }

  const isEmpty = assetItems.length === 0;
  const hasSearchOrFilter =
    Boolean(debouncedSearch.trim()) || Boolean(selectedNode);

  return (
    <View style={styles.container}>
      <AssetListSearchBar
        placeholder={`Tìm kiếm ${titleHeader?.toLowerCase() || "tài sản"}...`}
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText={selectedNode ? selectedNode.text : "Tất cả"}
        summaryText={`Tổng ${total} • Đã tải ${assetItems.length}`}
      />

      {!isEmpty ? (
        <AssetListSummaryCard
          iconName="funnel-outline"
          title={selectedNode ? selectedNode.text : "Toàn bộ tài sản"}
          subtitle={`${total} kết quả • hiển thị ${assetItems.length}`}
        />
      ) : null}

      <View style={styles.listWrap}>
        <FlatList
          key={`asset-list-${nameClass || "default"}-${listLayoutVersion}`}
          style={styles.list}
          data={assetItems}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingTop}
              onRefresh={refreshTop}
              colors={[BRAND_RED]}
              tintColor={BRAND_RED}
              progressViewOffset={50}
            />
          }
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === "android"}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
          ListHeaderComponent={null}
          stickyHeaderIndices={[]}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
          ]}
          ListEmptyComponent={
            <AssetListEmptyState
              iconName="cube-outline"
              title={
                hasSearchOrFilter
                  ? "Không tìm thấy tài sản"
                  : "Chưa có dữ liệu tài sản"
              }
              subtitle={
                hasSearchOrFilter
                  ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc danh mục"
                  : "Danh sách tài sản sẽ hiển thị tại đây khi có dữ liệu."
              }
            />
          }
        />
      </View>

      {renderTreePanel()}

      {loaded && nameClass && can(nameClass, "Insert") && (
        <AddItem
          nameClass={nameClass}
          field={fieldActive}
          propertyClass={propertyClass}
          titleHeader={titleHeader}
          groupMenuId={groupMenuId}
          viewPermission={viewPermission}
          assetTitleHeader={assetTitleHeader}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  menuScrollContent: {
    paddingBottom: 12,
  },
  headerButton: {
    paddingHorizontal: 5,
  },
  ...sharedAssetListStyles,
});
