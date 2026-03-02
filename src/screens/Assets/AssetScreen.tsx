import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import {
  DropdownProps,
  GetMenuActiveResponse,
  Item,
  StackNavigation,
} from "../../types/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../../components/ui/IconLoading";
import ReportView from "../../components/report/ReportView";
import { removeVietnameseTones } from "../../utils/Helper";
import { callApi } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

//
// DROPDOWN ITEM (MEMO)
//

const DropdownItem = React.memo(
  ({
    item,
    level = 0,
    expandedIds,
    onToggle,
    onShowReport,
    isSearching,
  }: DropdownProps & {
    onShowReport: (item: Item) => void;
    isSearching: boolean;
  }) => {
    const navigation = useNavigation<StackNavigation<"AssetList">>();

    const hasChildren = item.children?.length > 0;
    const expanded = expandedIds.includes(item.id);

    const handlePress = () => {
      if (hasChildren) {
        if (!isSearching) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        onToggle(item.id);
      } else if (item.isReport) {
        onShowReport(item);
      } else if (item.contentName_Mobile) {
        navigation.navigate("AssetList", {
          nameClass: item.contentName_Mobile,
          titleHeader: item.label,
        });
      }
    };

    return (
      <View style={{ paddingLeft: level > 0 ? 20 : 0, marginVertical: 4 }}>
        <Pressable style={styles.item} onPress={handlePress}>
          {item.isReport ? (
            <MaterialIcons name="bar-chart" size={18} color="red" />
          ) : item.contentName_Mobile ? (
            <MaterialIcons name="book" size={18} color="red" />
          ) : expanded ? (
            <Ionicons name="folder-open" size={18} color="red" />
          ) : (
            <Ionicons name="folder" size={18} color="red" />
          )}

          <Text style={styles.label}>{item.label}</Text>
        </Pressable>

        {expanded &&
          hasChildren &&
          item.children.map((child) => (
            <DropdownItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onShowReport={onShowReport}
              isSearching={isSearching}
            />
          ))}
      </View>
    );
  },
);

//
// MAIN SCREEN
//

export default function AssetScreen() {
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [reportItem, setReportItem] = useState<Item | null>(null);

  const fetchingRef = useRef(false);

  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);

  const firstLoadRef = useRef(true);

  //
  // BUILD TREE
  //

  const buildTree = (items: Item[]) => {
    const map: Record<string | number, Item> = {};
    const roots: Item[] = [];

    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach((item) => {
      if (item.parent === null) {
        roots.push(map[item.id]);
      } else if (map[item.parent]) {
        map[item.parent].children.push(map[item.id]);
      }
    });

    return roots;
  };

  //
  // FETCH
  //

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setIsFetching(true);

      const response = (await callApi(
        "POST",
        API_ENDPOINTS.GET_MENU_ACTIVE,
        {},
      )) as GetMenuActiveResponse;

      if (!Array.isArray(response?.data)) {
        throw new Error("Invalid data");
      }

      const menuAccount = response.data
        .filter((item) => item.typeGroup === 0)
        .sort((a, b) => Number(a.stt) - Number(b.stt));

      setData(buildTree(menuAccount));
    } catch (e) {
      error("API error:", e);
      Alert.alert("Lỗi", "Không thể tải dữ liệu menu.");
    } finally {
      fetchingRef.current = false;
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useAutoReload(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    fetchData();
  });

  //
  // SEARCH + AUTO EXPAND (1 LẦN DUYỆT)
  //

  const { filteredData, autoExpanded } = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return { filteredData: data, autoExpanded: [] };
    }

    const keyword = removeVietnameseTones(debouncedSearch.toLowerCase());

    const expandedSet = new Set<string | number>();

    const filterTree = (nodes: Item[]): Item[] =>
      nodes
        .map((node) => {
          const match = removeVietnameseTones(
            node.label.toLowerCase(),
          ).includes(keyword);

          const children = node.children?.length
            ? filterTree(node.children)
            : [];

          if (children.length > 0) {
            expandedSet.add(node.id);
          }

          if (match || children.length > 0) {
            return { ...node, children };
          }

          return null;
        })
        .filter(Boolean) as Item[];

    return {
      filteredData: filterTree(data),
      autoExpanded: Array.from(expandedSet),
    };
  }, [debouncedSearch, data]);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      setExpandedIds(autoExpanded);
    } else {
      setExpandedIds([]);
    }
  }, [debouncedSearch, autoExpanded]);

  //
  // TOGGLE
  //

  const handleToggle = (id: string | number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  //
  // SEARCH LOADING
  //

  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [search, debouncedSearch]);

  //
  // RENDER
  //

  if (isFetching && !debouncedSearch)
    return <IsLoading size="large" color="#FF3333" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* SEARCH */}
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Tìm kiếm..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          <View style={styles.spinnerWrapper}>
            {isSearching && <IsLoading size="small" color="#FF3333" />}
          </View>
        </View>

        {/* LIST */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <DropdownItem
              item={item}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onShowReport={setReportItem}
              isSearching={!!debouncedSearch}
            />
          )}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          initialNumToRender={20}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {/* MODAL REPORT */}
        <Modal
          visible={!!reportItem}
          animationType="slide"
          onRequestClose={() => setReportItem(null)}
        >
          {reportItem && (
            <ReportView
              title={reportItem.label}
              onClose={() => setReportItem(null)}
            />
          )}
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

//
// STYLES
//

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  label: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#333",
  },

  spinnerWrapper: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
