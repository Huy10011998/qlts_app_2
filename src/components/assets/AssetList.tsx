import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  Field,
  PropertyResponse,
  AssetDetailsNavigationProp,
  TreeNode,
  AssetListScreenRouteProp,
} from "../../types";
import {
  getFieldActive,
  getList,
  getPropertyClass,
  getBuildTree,
} from "../../services";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { normalizeText } from "../../utils/helper";
import { useDebounce } from "../../hooks/useDebounce";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SqlOperator, TypeProperty } from "../../utils/enum";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.6;

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
  node: TreeNode & { parentNode?: TreeNode | null }
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
}: {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
}) => {
  const [expanded, setExpanded] = useState(node.expanded || false);
  const hasChildren = node.children && node.children.length > 0;

  const handleIconPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={{ marginLeft: level * 4, marginVertical: 4, marginRight: 8 }}>
      <View style={styles.nodeRow}>
        {hasChildren ? (
          <TouchableOpacity onPress={handleIconPress}>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-forward"}
              size={22}
              color="#333"
              style={{ marginRight: 6 }}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22, marginRight: 6 }} />
        )}

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => onSelect(node)}
          activeOpacity={0.7}
        >
          <Text style={styles.nodeText}>{node.text}</Text>
        </TouchableOpacity>
      </View>

      {hasChildren && expanded && (
        <View>
          {node.children?.map((child) => (
            <TreeNodeItem
              key={child.index}
              node={child}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function AssetList() {
  const route = useRoute<AssetListScreenRouteProp>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();

  const { nameClass: paramNameClass, titleHeader } = route.params || {};
  const nameClass = paramNameClass;

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

  const debouncedSearch = useDebounce(searchText, 600);
  const pageSize = 20;

  // Drawer state
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;

  // Tree state
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  // Filter conditions
  const [conditions, setConditions] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const openMenu = async () => {
    setMenuVisible(true);

    if (nameClass) {
      try {
        setLoadingTree(true);
        const res = await getBuildTree(nameClass);
        const tree = buildTree(res.data || []);

        setTreeData(tree);
      } catch (e) {
        console.error("Lỗi load tree:", e);
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

  const toggleMenu = () => {
    if (menuVisible) closeMenu();
    else openMenu();
  };

  useEffect(() => {
    navigation.setParams({ onMenuPress: toggleMenu });
  }, [menuVisible]);

  //  Fetch data
  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass) return;

      if (isLoadMore) setIsLoadingMore(true);
      else {
        if (debouncedSearch) setIsSearching(true);
        else setIsLoading(true);
      }

      try {
        if (!isLoadMore && fieldActive.length === 0) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile)
          );
        }

        if (!isLoadMore && !propertyClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          setPropertyClass(responsePropertyClass?.data);

          navigation.setParams({
            isBuildTree: responsePropertyClass?.data?.isBuildTree || false,
          });
        }

        const currentSkip = isLoadMore ? skipSize : 0;

        const response = await getList(
          nameClass,
          "",
          pageSize,
          currentSkip,
          debouncedSearch,
          fieldActive,
          conditions,
          []
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
      } catch (error) {
        console.error("API error:", error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        if (!isLoadMore) setTaiSan([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsSearching(false);
      }
    },
    [
      nameClass,
      fieldActive,
      propertyClass,
      skipSize,
      debouncedSearch,
      conditions,
    ]
  );

  useEffect(() => {
    if (!nameClass) return;
    fetchData(false);
  }, [nameClass, debouncedSearch, conditions]);

  const handleLoadMore = () => {
    if (taisan.length < total && !isLoadingMore) fetchData(true);
  };

  const handlePress = async (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetDetails", {
        id: String(item.id),
        field: JSON.stringify(fieldActive),
        nameClass: nameClass,
        titleHeader: titleHeader,
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  //  Select node
  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);

    // Luôn build conditions từ node → root
    const newConditions = getConditionsFromNode(node as any);

    setConditions(newConditions);
    closeMenu();
  };

  if (isLoading && !debouncedSearch) return <IsLoading />;

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={(text) => setSearchText(normalizeText(text))}
          style={styles.searchInput}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color="#FF3333"
            style={styles.searchSpinner}
          />
        )}
      </View>

      {/* List */}
      <FlatList
        data={taisan}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListCardAsset
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              {selectedNode
                ? `${selectedNode.text} - Tổng: ${total} (Đã tải: ${taisan.length})`
                : `Tất cả - Tổng: ${total} (Đã tải: ${taisan.length})`}
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
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
            <Text style={styles.menuTitle}>Menu</Text>
            {loadingTree && <IsLoading size="small" />}
            {!loadingTree && treeData.length > 0 && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {treeData.map((node) => (
                  <TreeNodeItem
                    key={node.index}
                    node={node}
                    onSelect={handleSelectNode}
                  />
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    position: "relative",
    margin: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 36,
  },
  searchSpinner: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -10,
  },
  header: {
    textAlign: "center",
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  stickyHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    zIndex: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuContainer: {
    position: "absolute",
    right: 0,
    width: MENU_WIDTH,
    height: "100%",
    backgroundColor: "#fff",
    padding: 16,
    elevation: 5,
    zIndex: 999,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  nodeText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
});
