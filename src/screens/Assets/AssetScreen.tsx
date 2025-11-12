import React, { useEffect, useState, useMemo, useRef } from "react";
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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import {
  AssetListScreenNavigationProp,
  DropdownProps,
  GetMenuActiveResponse,
  Item,
} from "../../types/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../../components/ui/IconLoading";
import ReportView from "../../components/report/ReportView";
import { removeVietnameseTones } from "../../utils/Helper";
import { callApi } from "../../services/data/CallApi";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Component cho mỗi item dropdown
const DropdownItem: React.FC<
  DropdownProps & {
    onShowReport: (item: Item) => void;
  }
> = ({ item, level = 0, expandedIds, onToggle, onShowReport }) => {
  const navigation = useNavigation<AssetListScreenNavigationProp>();
  const hasChildren = item.children && item.children.length > 0;
  const expanded = expandedIds.includes(item.id);

  const handlePress = () => {
    if (hasChildren) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggle(item.id);
    } else if (item.isReport) {
      // Nếu là báo cáo thì mở modal ReportView
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
      <Pressable
        onPress={handlePress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#eee",
          shadowColor: "#000",
          backgroundColor: "#fff",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        {item.isReport ? (
          <MaterialIcons name="bar-chart" size={18} color="red" />
        ) : item.contentName_Mobile ? (
          <MaterialIcons name="book" size={18} color="red" />
        ) : expanded ? (
          <Ionicons name="folder-open" size={18} color="red" />
        ) : (
          <Ionicons name="folder" size={18} color="red" />
        )}

        <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "bold" }}>
          {item.label}
        </Text>
      </Pressable>

      {expanded && hasChildren && (
        <View style={{ marginTop: 4 }}>
          {item.children.map((child) => (
            <DropdownItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onShowReport={onShowReport}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function AssetScreen() {
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  // debounce search
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);

  // State modal report
  const [reportItem, setReportItem] = useState<Item | null>(null);

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

  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) {
      setExpandedIds([]);
      return data;
    }

    const keyword = removeVietnameseTones(debouncedSearch);
    const expandedSet = new Set<string | number>();

    const filterTree = (nodes: Item[]): Item[] => {
      return nodes
        .map((node) => {
          const match = removeVietnameseTones(node.label).includes(keyword);
          const filteredChildren = node.children.length
            ? filterTree(node.children)
            : [];
          if (match || filteredChildren.length > 0) {
            if (filteredChildren.length > 0) expandedSet.add(node.id);
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter((n): n is Item => n !== null);
    };

    const result = filterTree(data);
    setExpandedIds(Array.from(expandedSet));
    return result;
  }, [debouncedSearch, data]);

  const handleToggle = (id: string | number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = (await callApi(
          "POST",
          API_ENDPOINTS.GET_MENU_ACTIVE,
          {}
        )) as GetMenuActiveResponse;

        if (Array.isArray(response?.data)) {
          const menuAccount = response.data
            .filter((item) => item.typeGroup === 0)
            .sort((a, b) => Number(a.stt) - Number(b.stt));
          setData(buildTree(menuAccount));
        } else {
          throw new Error("Dữ liệu trả về không hợp lệ.");
        }
      } catch (error) {
        console.error("API error:", error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu menu.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, []);

  // show loading nhỏ trong search khi gõ
  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [search, debouncedSearch]);

  return (
    <View style={{ flex: 1 }}>
      {/* Ô tìm kiếm */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          margin: 12,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          backgroundColor: "#fff",
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          ref={searchInputRef}
          placeholder="Tìm kiếm..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            paddingVertical: 10,
          }}
        />
        {isSearching && (
          <IsLoading
            size="small"
            color="#FF3333"
            style={styles.searchSpinner}
          />
        )}
      </View>

      {/* Danh sách menu */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DropdownItem
            item={item}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onShowReport={setReportItem}
          />
        )}
        contentContainerStyle={{
          paddingVertical: 12,
          paddingHorizontal: 12,
        }}
        ListHeaderComponent={
          isFetching ? <IsLoading size="small" style={{ margin: 12 }} /> : null
        }
        style={{ backgroundColor: "#fff", marginBottom: 60 }}
      />

      {/* Modal báo cáo */}
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
  );
}

const styles = StyleSheet.create({
  searchSpinner: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -10,
  },
});
