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
  KeyboardAvoidingView,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../../components/ui/IconLoading";
import { removeVietnameseTones } from "../../utils/Helper";
import { getVungCamera } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";

//
// TYPE
//

interface CameraItem {
  id: string;
  parent: string | null;
  label: string;
  children: CameraItem[];
}

const getItemTheme = (item: CameraItem, expanded: boolean) => {
  if (item.children.length > 0) {
    return expanded
      ? {
          icon: "folder-open",
          lib: "ionicons",
          bg: "#FFF5F5",
          color: BRAND_RED,
        }
      : {
          icon: "folder",
          lib: "ionicons",
          bg: "#FFF8F0",
          color: "#E67700",
        };
  }

  return {
    icon: "videocam",
    lib: "material",
    bg: "#EEF2FF",
    color: "#3B5BDB",
  };
};

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
  const theme = getItemTheme(item, expanded);

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
    onToggle(item.id);
  };

  return (
    <View style={[styles.itemWrap, { paddingLeft: level > 0 ? 16 : 0 }]}>
      <View style={[styles.itemCard, level > 0 && styles.itemCardChild]}>
        {level === 0 && (
          <View style={[styles.accent, { backgroundColor: theme.color }]} />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.itemMainPressable,
            pressed && styles.itemPressed,
          ]}
          onPress={handleNavigate}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
            {theme.lib === "material" ? (
              <MaterialIcons
                name={theme.icon as any}
                size={16}
                color={theme.color}
              />
            ) : (
              <Ionicons
                name={theme.icon as any}
                size={16}
                color={theme.color}
              />
            )}
          </View>

          <Text
            style={[styles.label, level > 0 && styles.labelChild]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
        </Pressable>

        {hasChildren ? (
          <Pressable
            onPress={handleToggle}
            hitSlop={10}
            style={({ pressed }) => [
              styles.chevronWrap,
              { backgroundColor: theme.bg },
              pressed && styles.itemPressed,
            ]}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color={theme.color}
            />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
        )}
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
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);

  const fetchingRef = useRef(false);
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
    return <IsLoading size="large" color={BRAND_RED} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <View style={styles.searchIconWrap}>
              <Ionicons name="search-outline" size={16} color="#8A95A3" />
            </View>
            <TextInput
              placeholder="Tìm kiếm camera..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#B0B8C4"
              style={styles.searchInput}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {isSearching && (
              <View style={styles.spinnerWrapper}>
                <IsLoading size="small" color={BRAND_RED} />
              </View>
            )}
            {!isSearching && search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={16} color="#B0B8C4" />
              </Pressable>
            )}
          </View>

          {debouncedSearch.trim() ? (
            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>
                {filteredTree.length} kết quả
              </Text>
            </View>
          ) : null}
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
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          initialNumToRender={20}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="videocam-outline" size={32} color="#C7C7CC" />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy camera</Text>
              <Text style={styles.emptySub}>
                Thử tìm kiếm với tên khu vực hoặc camera khác
              </Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

//
// STYLES
//

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  itemWrap: {
    marginBottom: 6,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 0,
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  itemCardChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
  },
  itemMainPressable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  itemPressed: {
    opacity: 0.75,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginRight: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F1923",
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  labelChild: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#374151",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
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
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
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
  spinnerWrapper: {
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
  resultBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    color: BRAND_RED,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
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
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
