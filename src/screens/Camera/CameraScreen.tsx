import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  StyleSheet,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../../components/ui/IconLoading";
import { removeVietnameseTones } from "../../utils/Helper";
import { getVungCamera } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";
import { KeyboardAvoidingView } from "react-native";
import { useSafeAlert } from "../../hooks/useSafeAlert";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

//
// TYPE
//

interface CameraItem {
  id: string;
  parent: string | null;
  label: string;
  children: CameraItem[];
}

//
// DROPDOWN ITEM
//

const DropdownItem = ({
  item,
  level = 0,
  expandedIds,
  onToggle,
  rawData,
}: {
  item: CameraItem;
  level?: number;
  expandedIds: string[];
  onToggle: (id: string) => void;
  rawData: any[];
}) => {
  const navigation = useNavigation<any>();

  const hasChildren = item.children.length > 0;
  const expanded = expandedIds.includes(item.id);

  const getAllZoneIds = (zoneId: number, allZones: any[]): number[] => {
    const result = [zoneId];
    const children = allZones.filter((z) => z.iD_VungCameraParent === zoneId);

    children.forEach((child) => {
      result.push(...getAllZoneIds(child.iD_VungCamera, allZones));
    });

    return result;
  };

  const handleNavigate = () => {
    const zoneId = Number(item.id);
    const zoneIds = getAllZoneIds(zoneId, rawData);

    const cameras = rawData
      .filter(
        (cam) =>
          cam.iD_Camera != null &&
          cam.iD_Camera_Ma != null &&
          zoneIds.includes(cam.iD_VungCamera),
      )
      .map((cam) => ({
        iD_Camera: cam.iD_Camera,
        iD_Camera_MoTa: cam.iD_Camera_MoTa,
        iD_Camera_Ma: cam.iD_Camera_Ma,
      }));

    navigation.navigate("CameraList", {
      zoneId,
      zoneName: item.label,
      cameras,
    });
  };

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(item.id);
  };

  return (
    <View style={{ paddingLeft: level * 20, marginVertical: 4 }}>
      <View style={styles.item}>
        {hasChildren && (
          <Pressable onPress={handleToggle} hitSlop={10}>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color="#999"
            />
          </Pressable>
        )}

        <Pressable style={styles.right} onPress={handleNavigate}>
          {hasChildren ? (
            expanded ? (
              <Ionicons name="folder-open" size={18} color="red" />
            ) : (
              <Ionicons name="folder" size={18} color="red" />
            )
          ) : (
            <MaterialIcons name="videocam" size={18} color="red" />
          )}
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      </View>

      {expanded &&
        item.children.map((child) => (
          <DropdownItem
            key={child.id}
            item={child}
            level={level + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
            rawData={rawData}
          />
        ))}
    </View>
  );
};

//
// MAIN SCREEN
//

export default function CameraScreen() {
  const [data, setData] = useState<CameraItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);

  const fetchingRef = useRef(false);
  const firstLoadRef = useRef(true);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  //
  // BUILD TREE
  //

  const buildTree = (items: any[]): CameraItem[] => {
    const map: Record<number, CameraItem> = {};
    const roots: CameraItem[] = [];

    const distinctItems = Array.from(
      new Map(items.map((item) => [item.iD_VungCamera, item])).values(),
    );

    distinctItems.forEach((item) => {
      map[item.iD_VungCamera] = {
        id: item.iD_VungCamera.toString(),
        parent:
          item.iD_VungCameraParent != null
            ? item.iD_VungCameraParent.toString()
            : null,
        label: item.iD_VungCamera_MoTa,
        children: [],
      };
    });

    distinctItems.forEach((item) => {
      const node = map[item.iD_VungCamera];

      if (item.iD_VungCameraParent == null) {
        roots.push(node);
      } else {
        const parent = map[item.iD_VungCameraParent];
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
  };

  //
  // FETCH
  //

  const fetchData = async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setIsFetching(true);

    try {
      const response: any = await getVungCamera();

      setRawData(response.data);
      setData(buildTree(response.data));
    } catch (e) {
      error("API error:", e);
      showAlertIfActive("Lỗi", "Không tải được dữ liệu camera.");
    } finally {
      fetchingRef.current = false;
      if (isMounted()) {
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  //
  // SEARCH (pure useMemo)
  //

  const { filteredTree, autoExpand } = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return { filteredTree: data, autoExpand: [] };
    }

    const keyword = removeVietnameseTones(debouncedSearch.toLowerCase());

    const expandedSet = new Set<string>();

    const filterTree = (nodes: CameraItem[]): CameraItem[] =>
      nodes
        .map((node) => {
          const match = removeVietnameseTones(
            node.label.toLowerCase(),
          ).includes(keyword);

          const children = filterTree(node.children);

          if (children.length > 0) expandedSet.add(node.id);

          if (match || children.length > 0) {
            return { ...node, children };
          }

          return null;
        })
        .filter(Boolean) as CameraItem[];

    return {
      filteredTree: filterTree(data),
      autoExpand: Array.from(expandedSet),
    };
  }, [debouncedSearch, data]);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      setExpandedIds(autoExpand);
    }
  }, [autoExpand, debouncedSearch]);

  //
  // TOGGLE
  //

  const handleToggle = (id: string) => {
    if (!debouncedSearch) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // show loading nhỏ trong search khi gõ
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
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Tìm kiếm..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
            style={{ flex: 1, paddingVertical: 10, color: "#333" }}
          />
          <View style={styles.spinnerWrapper}>
            {isSearching && <IsLoading size="small" color="#FF3333" />}
          </View>
        </View>

        <FlatList
          data={filteredTree}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DropdownItem
              item={item}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              rawData={rawData}
            />
          )}
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 12,
          }}
          removeClippedSubviews
          initialNumToRender={20}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
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
    justifyContent: "space-between",
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

  right: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingLeft: 8,
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

  searchSpinner: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -10,
  },

  spinnerWrapper: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
