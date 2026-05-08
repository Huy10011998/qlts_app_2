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
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Animated,
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
import { useSafeAlert } from "../../hooks/useSafeAlert";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";

// ─── Icon config per item type ────────────────────────────────────────────────
const getItemTheme = (item: Item, expanded: boolean) => {
  if (item.isReport)
    return {
      icon: "bar-chart",
      lib: "material",
      bg: "#FFF0F6",
      color: "#E64980",
    };
  if (item.contentName_Mobile)
    return { icon: "book", lib: "material", bg: "#EEF2FF", color: "#3B5BDB" };
  if (expanded)
    return {
      icon: "folder-open",
      lib: "ionicons",
      bg: "#FFF5F5",
      color: BRAND_RED,
    };
  return { icon: "folder", lib: "ionicons", bg: "#FFF8F0", color: "#E67700" };
};

// ─── Dropdown Item ────────────────────────────────────────────────────────────
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
    const theme = getItemTheme(item, expanded);

    const handlePress = () => {
      if (hasChildren) {
        if (!isSearching)
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <View style={{ paddingLeft: level > 0 ? 16 : 0, marginBottom: 6 }}>
        <Pressable
          style={({ pressed }) => [
            itemS.card,
            level > 0 && itemS.cardChild,
            pressed && itemS.cardPressed,
          ]}
          onPress={handlePress}
          android_ripple={{ color: "rgba(0,0,0,0.04)" }}
        >
          {/* Left accent bar for root items */}
          {level === 0 && (
            <View style={[itemS.accent, { backgroundColor: theme.color }]} />
          )}

          {/* Icon */}
          <View style={[itemS.iconWrap, { backgroundColor: theme.bg }]}>
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

          {/* Label */}
          <Text
            style={[itemS.label, level > 0 && itemS.labelChild]}
            numberOfLines={2}
          >
            {item.label}
          </Text>

          {/* Trailing: chevron or arrow */}
          {hasChildren ? (
            <View style={[itemS.chevronWrap, { backgroundColor: theme.bg }]}>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={13}
                color={theme.color}
              />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
          )}
        </Pressable>

        {/* Children */}
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

const itemS = StyleSheet.create({
  card: {
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
  cardChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
  },
  cardPressed: { opacity: 0.75 },
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
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssetScreen() {
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [reportItem, setReportItem] = useState<Item | null>(null);

  const fetchingRef = useRef(false);
  const firstLoadRef = useRef(true);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  // ── Build tree ──
  const buildTree = (items: Item[]) => {
    const map: Record<string | number, Item> = {};
    const roots: Item[] = [];
    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });
    items.forEach((item) => {
      if (item.parent === null) roots.push(map[item.id]);
      else if (map[item.parent]) map[item.parent].children.push(map[item.id]);
    });
    return roots;
  };

  // ── Fetch ──
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
      if (!Array.isArray(response?.data)) throw new Error("Invalid data");
      const menuAccount = response.data
        .filter((item) => item.iD_GroupMenu === 2)
        .sort((a, b) => Number(a.stt) - Number(b.stt));
      setData(buildTree(menuAccount));
    } catch (e) {
      error("API error:", e);
      showAlertIfActive("Lỗi", "Không thể tải dữ liệu menu.");
    } finally {
      fetchingRef.current = false;
      if (isMounted()) setIsFetching(false);
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

  // ── Search + auto expand ──
  const { filteredData, autoExpanded } = useMemo(() => {
    if (!debouncedSearch.trim())
      return { filteredData: data, autoExpanded: [] };
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
          if (children.length > 0) expandedSet.add(node.id);
          if (match || children.length > 0) return { ...node, children };
          return null;
        })
        .filter(Boolean) as Item[];
    return {
      filteredData: filterTree(data),
      autoExpanded: Array.from(expandedSet),
    };
  }, [debouncedSearch, data]);

  useEffect(() => {
    if (debouncedSearch.trim()) setExpandedIds(autoExpanded);
    else setExpandedIds([]);
  }, [debouncedSearch, autoExpanded]);

  const handleToggle = (id: string | number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    setIsSearching(search !== debouncedSearch);
  }, [search, debouncedSearch]);

  if (isFetching && !debouncedSearch)
    return <IsLoading size="large" color={BRAND_RED} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <View style={s.searchIconWrap}>
            <Ionicons name="search-outline" size={16} color="#8A95A3" />
          </View>
          <TextInput
            placeholder="Tìm kiếm tài sản..."
            placeholderTextColor="#B0B8C4"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {isSearching && (
            <View style={s.spinnerWrap}>
              <IsLoading size="small" color={BRAND_RED} />
            </View>
          )}
          {!isSearching && search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={s.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#B0B8C4" />
            </Pressable>
          )}
        </View>

        {/* Result count badge */}
        {debouncedSearch.trim() ? (
          <View style={s.resultBadge}>
            <Text style={s.resultText}>{filteredData.length} kết quả</Text>
          </View>
        ) : null}
      </View>

      {/* ── List ── */}
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
        contentContainerStyle={s.listContent}
        removeClippedSubviews
        initialNumToRender={20}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="search-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={s.emptyTitle}>Không tìm thấy kết quả</Text>
            <Text style={s.emptySub}>Thử tìm kiếm với từ khóa khác</Text>
          </View>
        }
      />

      {/* ── Modal Report ── */}
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
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Search
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
    borderRadius: 14,
    paddingHorizontal: 12,
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
  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  clearBtn: {
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

  // List
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },

  // Empty state
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
