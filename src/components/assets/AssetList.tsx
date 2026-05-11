import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Field,
  PropertyResponse,
  StackNavigation,
  TreeNode,
} from "../../types/Index";
import {
  getFieldActive,
  getList,
  getPropertyClass,
  getBuildTree,
} from "../../services/Index";
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
  setSelectedTreeNode,
} from "../../store/AssetSlice";
import { error } from "../../utils/Logger";
import { usePermission } from "../../hooks/usePermission";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useAppDispatch } from "../../store/Hooks";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/CallApi";
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
import { BG, BRAND_RED, CARD_SHADOW } from "./shared/listTheme";
import { sharedAssetListStyles } from "./shared/listStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

export default function AssetList() {
  const navigation = useNavigation<StackNavigation<"AssetList">>();

  const { nameClass, titleHeader } = useParams();

  const [taisan, setTaiSan] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");

  const [isRefreshingTop, setIsRefreshingTop] = useState(false);

  const debouncedSearch = useDebounce(searchText, 600);
  const pageSize = 20;

  // Tree state
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  // Filter conditions
  const [conditions, setConditions] = useState<AssetFilterCondition[]>([]);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  // Redux
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Khi vào AssetList thì reset node cũ
    dispatch(resetSelectedTreeNode());
  }, []);

  useReloadPermissionsOnFocus();

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );

  // Check Permission
  const { can, loaded } = usePermission();

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    setSkipSize(0);

    await fetchData(false, { isRefresh: true });

    setIsRefreshingTop(false);
  };

  const treeLoadedRef = useRef(false);
  const loadTreeMenu = useCallback(async () => {
    if (!nameClass || treeLoadedRef.current) return;

    try {
      setLoadingTree(true);
      const res = await getBuildTree(nameClass);
      setTreeData(buildTree(res.data || []));
      treeLoadedRef.current = true;
    } catch (e) {
      error("Lỗi load tree:", e);
    } finally {
      setLoadingTree(false);
    }
  }, [nameClass]);

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
    void togglePanel();
  }, [propertyClass?.isBuildTree, togglePanel]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        propertyClass?.isBuildTree ? (
          <TouchableOpacity
            onPress={toggleMenu}
            style={{ paddingHorizontal: 5 }}
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        ) : null,
    });
  }, [toggleMenu, propertyClass?.isBuildTree]);

  // Redux
  useFocusEffect(
    React.useCallback(() => {
      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
      }
    }, [shouldRefresh]),
  );

  //  Fetch data
  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (!nameClass) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActive.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClass);

      if (!isLoadMore && !isRefresh && isFirstLoad) {
        setIsLoading(true);
      }

      try {
        if (shouldReloadFieldConfig) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];

          setFieldActive(activeFields);

          setFieldShowMobile(
            activeFields.filter((f: any) => Boolean(Number(f.isShowMobile))),
          );
        }

        if (shouldReloadPropertyClass && nameClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          setPropertyClass(responsePropertyClass?.data);
        }

        const currentSkip = isLoadMore ? skipSize : 0;

        const response = await getList(
          nameClass,
          "",
          pageSize,
          currentSkip,
          debouncedSearch,
          conditions,
          [],
        );

        const newItems: Record<string, any>[] = response?.data?.items || [];
        const totalItems = response?.data?.totalCount || 0;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isLoadMore) {
          setTaiSan((prev) => [...prev, ...newItems]);
          setSkipSize(currentSkip + pageSize);
        } else {
          setTaiSan(newItems);
          setSkipSize(pageSize);
        }

        setTotal(totalItems);
      } catch (e) {
        error("API error:", e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu.");
        }
        if (!isLoadMore) setTaiSan([]);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsFirstLoad(false);
        }
      }
    },
    [
      nameClass,
      fieldActive.length,
      propertyClass,
      skipSize,
      debouncedSearch,
      conditions,
      isFirstLoad,
    ],
  );

  // Tự động reload khi có sự kiện từ add/edit item
  useAutoReload(fetchData);

  useEffect(() => {
    if (!nameClass) return;
    fetchData(false);
  }, [nameClass]);

  const handleLoadMore = () => {
    if (taisan.length < total && !isLoadingMore && !isLoading) {
      setIsLoadingMore(true);
      fetchData(true);
    }
  };

  const handlePress = async (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetDetails", {
        id: String(item.id),
        field: JSON.stringify(fieldActive),
        nameClass,
        titleHeader,
        propertyClass,
      });
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  //  Select node
  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);

    // Lưu vào redux
    dispatch(
      setSelectedTreeNode({
        value: node.value ?? null,
        property: node.property ?? null,
        text: node.text ?? null,
      }),
    );

    // Build điều kiện từ node → root
    const newConditions = getConditionsFromNode(node);

    setConditions(newConditions);
    closeMenu();
  };

  useEffect(() => {
    if (!nameClass) return;

    const isSearch = debouncedSearch.trim().length > 0;

    if (isSearch) {
      setIsSearching(true); // bật spinner search
    }

    setIsLoading(true);
    setSkipSize(0);
    setTaiSan([]);

    fetchData(false).finally(() => {
      if (isSearch) {
        setIsSearching(false); // tắt spinner SAU KHI SEARCH XONG
      }
    });
  }, [debouncedSearch, conditions]);

  const renderItem = useCallback(
    ({ item }: { item: Record<string, any> }) => (
      <ListCardAsset
        item={item}
        fields={fieldShowMobile.length ? fieldShowMobile : fieldActive}
        icon={propertyClass?.iconMobile || ""}
        onPress={() => handlePress(item)}
      />
    ),
    [fieldShowMobile, fieldActive, propertyClass],
  );

  if (
    isLoading &&
    !isRefreshingTop &&
    !isLoadingMore &&
    !isSearching // thêm điều kiện này
  ) {
    return <IsLoading size="large" color="#E31E24" />;
  }

  return (
    <View style={styles.container}>
      <AssetListSearchBar
        placeholder={`Tìm kiếm ${titleHeader?.toLowerCase() || "tài sản"}...`}
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText={selectedNode ? selectedNode.text : "Tất cả"}
        summaryText={`Tổng ${total} • Đã tải ${taisan.length}`}
      />

      {/* List */}
      <FlatList
        data={taisan}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={["#E31E24"]} // Android
            tintColor="#E31E24" // iOS
            progressViewOffset={50}
          />
        }
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <AssetListSummaryCard
            iconName="funnel-outline"
            title={selectedNode ? selectedNode.text : "Toàn bộ tài sản"}
            subtitle={`${total} kết quả • hiển thị ${taisan.length}`}
          />
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.listContent,
          taisan.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="cube-outline"
            title="Không tìm thấy tài sản"
            subtitle="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc danh mục"
          />
        }
      />

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
      </SlideInSidePanel>

      {loaded && nameClass && can(nameClass, "Insert") && (
        <AddItem
          nameClass={nameClass}
          field={fieldActive} // object
          propertyClass={propertyClass}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContentEmpty: {
    justifyContent: "flex-start",
  },
  menuScrollContent: {
    paddingBottom: 12,
  },
  ...sharedAssetListStyles,
});
