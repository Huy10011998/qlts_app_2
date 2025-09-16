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
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import {
  AssetListScreenNavigationProp,
  DropdownProps,
  GetMenuActiveResponse,
  Item,
} from "../../types";
import {
  callApi,
  removeVietnameseTones,
  splitNameClass,
} from "../../utils/helper";
import { API_ENDPOINTS } from "../../config";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Component cho mỗi item dropdown
const DropdownItem: React.FC<DropdownProps> = ({
  item,
  level = 0,
  expandedIds,
  onToggle,
}) => {
  const navigation = useNavigation<AssetListScreenNavigationProp>();
  const hasChildren = item.children && item.children.length > 0;
  const expanded = expandedIds.includes(item.id);

  const handlePress = () => {
    if (hasChildren) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggle(item.id);
    } else if (item.contentName_Mobile) {
      const { key, label } = splitNameClass(item.contentName_Mobile);
      navigation.navigate("AssetList", {
        nameClass: key,
        titleHeader: label,
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
        {item.contentName_Mobile ? (
          <Ionicons name="pin" size={18} color="red" />
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
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function AssetScreen() {
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(true); // chỉ loading fetch
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const searchInputRef = useRef<TextInput>(null);

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
    if (!search.trim()) {
      setExpandedIds([]);
      return data;
    }

    const keyword = removeVietnameseTones(search);
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
  }, [search, data]);

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

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        ref={searchInputRef}
        placeholder="Tìm kiếm..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          backgroundColor: "#fff",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          margin: 12,
        }}
      />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DropdownItem
            item={item}
            expandedIds={expandedIds}
            onToggle={handleToggle}
          />
        )}
        contentContainerStyle={{
          paddingVertical: 12,
          paddingHorizontal: 12,
        }}
        ListHeaderComponent={
          isFetching ? (
            <ActivityIndicator
              size="small"
              color="#999"
              style={{ margin: 12 }}
            />
          ) : null
        }
        style={{ backgroundColor: "#fff", marginBottom: 60 }}
      />
    </View>
  );
}
