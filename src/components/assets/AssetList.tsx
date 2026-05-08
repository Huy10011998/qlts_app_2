import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ScrollView,
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
import { SqlOperator, TypeProperty } from "../../utils/Enum";
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
import { reloadPermissions } from "../../store/PermissionActions";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/CallApi";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;
const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";
const CARD_SHADOW = {
  shadowColor: "#1A2340",
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

//  Build tree từ flat list
function buildTree(data: TreeNode[]): TreeNode[] {
  const map: Record<number, TreeNode & { parentNode?: TreeNode | null }> = {};
  const roots: TreeNode[] = [];

  data.forEach((item) => {
    map[item.index] = { ...item, children: [], parentNode: null };
  });

  data.forEach((item) => {
    if (item.parent === null) {
      roots.push(map[item.index]);
    } else {
      const parent = map[item.parent];
      if (parent) {
        map[item.index].parentNode = parent;
        parent.children?.push(map[item.index]);
      }
    }
  });

  return roots;
}

//  Hàm gom conditions từ node → root
function getConditionsFromNode(
  node: TreeNode & { parentNode?: TreeNode | null },
) {
  const conditions: any[] = [];
  const seen = new Set<string>(); // để loại trùng property+value
  let current: TreeNode | null = node;

  while (current) {
    if (current.property && current.value) {
      const props = current.property.split(",");
      const values = current.value.split(",");

      props.forEach((prop, idx) => {
        const rawValue = values[idx] ? values[idx].trim() : "";
        const intValue = parseInt(rawValue, 10);
        const key = `${prop.trim()}-${rawValue}`;

        if (!seen.has(key)) {
          seen.add(key);

          if (!isNaN(intValue)) {
            conditions.push({
              property: prop.trim(),
              operator:
                intValue >= 0 ? SqlOperator.Equals : SqlOperator.NotEquals,
              value: String(Math.abs(intValue)),
              type: TypeProperty.Int,
            });
          } else {
            conditions.push({
              property: prop.trim(),
              operator: SqlOperator.Equals,
              value: rawValue,
              type: TypeProperty.String,
            });
          }
        }
      });
    }

    current = (current as any).parentNode ?? null;
  }

  return conditions;
}

//  Component đệ quy render tree dropdown
const TreeNodeItem = ({
  node,
  level = 0,
  onSelect,
  expandAll = false,
  selectedNode,
}: {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  expandAll?: boolean;
  selectedNode: TreeNode | null;
}) => {
  const [expanded, setExpanded] = useState(node.expanded || expandAll);

  useEffect(() => {
    if (expandAll) setExpanded(true);
  }, [expandAll]);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode?.index === node.index;

  const handleIconPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.nodeWrap, { paddingLeft: level > 0 ? 16 : 0 }]}>
      <View
        style={[
          styles.nodeRow,
          level > 0 && styles.nodeRowChild,
          isSelected && styles.nodeRowSelected,
        ]}
      >
        {level === 0 && (
          <View
            style={[
              styles.nodeAccent,
              { backgroundColor: isSelected ? BRAND_RED : "#E67700" },
            ]}
          />
        )}

        <TouchableOpacity
          style={styles.nodeTextWrap}
          onPress={() => onSelect(node)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.nodeIconWrap,
              { backgroundColor: hasChildren ? "#FFF8F0" : "#EEF2FF" },
            ]}
          >
            <Ionicons
              name={hasChildren ? "folder-open" : "document-text-outline"}
              size={16}
              color={hasChildren ? "#E67700" : "#3B5BDB"}
            />
          </View>
          <Text
            style={[styles.nodeText, level > 0 && styles.nodeTextChild]}
            numberOfLines={2}
          >
            {node.text}
          </Text>
        </TouchableOpacity>

        {hasChildren ? (
          <TouchableOpacity
            onPress={handleIconPress}
            style={styles.nodeChevronWrap}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color="#E67700"
            />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
        )}
      </View>

      {hasChildren && expanded && (
        <View>
          {node.children?.map((child) => (
            <TreeNodeItem
              key={child.index}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              expandAll={expandAll}
              selectedNode={selectedNode}
            />
          ))}
        </View>
      )}
    </View>
  );
};

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

  // Drawer state
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;

  // Tree state
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  // Filter conditions
  const [conditions, setConditions] = useState<
    {
      property: string;
      operator: SqlOperator;
      value: string;
      type: TypeProperty;
    }[]
  >([]);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  // Redux
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Khi vào AssetList thì reset node cũ
    dispatch(resetSelectedTreeNode());
  }, []);

  // reload permission mỗi lần quay lại màn
  useFocusEffect(
    useCallback(() => {
      dispatch(reloadPermissions());
    }, [dispatch]),
  );

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

  const openMenu = async () => {
    setMenuVisible(true);

    if (nameClass && !treeLoadedRef.current) {
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
    }

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: MENU_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const toggleMenu = useCallback(() => {
    if (!propertyClass?.isBuildTree) return;
    if (menuVisible) closeMenu();
    else openMenu();
  }, [menuVisible, propertyClass?.isBuildTree]);

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

      if (!isLoadMore && !isRefresh && isFirstLoad) {
        setIsLoading(true);
      }

      try {
        if (!isLoadMore && fieldActive.length === 0) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];

          setFieldActive(activeFields);

          setFieldShowMobile(
            activeFields.filter((f: any) => Boolean(Number(f.isShowMobile))),
          );
        }

        if (!isLoadMore && !propertyClass && nameClass) {
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
    const newConditions = getConditionsFromNode(node as any);

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
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search-outline" size={16} color="#8A95A3" />
          </View>
          <TextInput
            placeholder={`Tìm kiếm ${titleHeader?.toLowerCase() || "tài sản"}...`}
            placeholderTextColor="#B0B8C4"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {isSearching && (
            <View style={styles.spinnerWrap}>
              <IsLoading size="small" color={BRAND_RED} />
            </View>
          )}
          {!isSearching && searchText.length > 0 && (
            <Pressable
              onPress={() => setSearchText("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={16} color="#B0B8C4" />
            </Pressable>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              {selectedNode ? selectedNode.text : "Tất cả"}
            </Text>
          </View>
          <Text style={styles.summaryMeta}>
            Tổng {total} • Đã tải {taisan.length}
          </Text>
        </View>
      </View>

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
          <View style={styles.stickyHeader}>
            <View style={styles.filterCard}>
              <View style={styles.filterCardIcon}>
                <Ionicons name="funnel-outline" size={16} color={BRAND_RED} />
              </View>
              <View style={styles.filterCardContent}>
                <Text style={styles.filterCardTitle} numberOfLines={1}>
                  {selectedNode ? selectedNode.text : "Toàn bộ tài sản"}
                </Text>
                <Text style={styles.filterCardSub}>
                  {total} kết quả • hiển thị {taisan.length}
                </Text>
              </View>
            </View>
          </View>
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy tài sản</Text>
            <Text style={styles.emptySub}>
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc danh mục
            </Text>
          </View>
        }
      />

      {/* Drawer */}
      {menuVisible && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.overlay} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.menuContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuTitle}>Danh mục</Text>
                <Text style={styles.menuSubTitle}>Chọn nhóm để lọc tài sản</Text>
              </View>
              <Pressable onPress={closeMenu} style={styles.menuCloseButton}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </Pressable>
            </View>
            {loadingTree && <IsLoading size="small" />}
            {!loadingTree && treeData.length > 0 && (
              <ScrollView
                style={styles.menuScroll}
                contentContainerStyle={styles.menuScrollContent}
              >
                {treeData.map((node) => (
                  <TreeNodeItem
                    key={node.index}
                    node={node}
                    onSelect={handleSelectNode}
                    expandAll={true}
                    selectedNode={selectedNode}
                  />
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      )}

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
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: BG,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    ...CARD_SHADOW,
  },
  searchIconWrap: {
    marginRight: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F1923",
    fontWeight: "400",
  },
  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  summaryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    flexShrink: 1,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: BRAND_RED,
  },
  summaryMeta: {
    fontSize: 11.5,
    color: "#8A95A3",
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 24,
  },
  stickyHeader: {
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
    zIndex: 10,
  },
  filterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    ...CARD_SHADOW,
  },
  filterCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    marginRight: 10,
  },
  filterCardContent: {
    flex: 1,
  },
  filterCardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F1923",
    marginBottom: 2,
  },
  filterCardSub: {
    fontSize: 11.5,
    color: "#8A95A3",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 25, 35, 0.18)",
  },
  menuContainer: {
    position: "absolute",
    right: 0,
    width: MENU_WIDTH,
    height: "100%",
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 12,
    elevation: 5,
    zIndex: 999,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F1923",
  },
  menuSubTitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#8A95A3",
  },
  menuCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 12,
  },
  nodeWrap: {
    marginBottom: 6,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 0,
    overflow: "hidden",
    gap: 10,
    ...CARD_SHADOW,
  },
  nodeRowChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
  },
  nodeRowSelected: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    backgroundColor: "#FFF8F8",
  },
  nodeAccent: {
    width: 4,
    alignSelf: "stretch",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginRight: 2,
  },
  nodeTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nodeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nodeText: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F1923",
    fontWeight: "600",
    lineHeight: 18,
  },
  nodeTextChild: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#374151",
  },
  nodeChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F0",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: "#8A95A3",
    textAlign: "center",
    lineHeight: 18,
  },
});
