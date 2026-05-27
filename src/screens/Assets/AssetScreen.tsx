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
  FlatList,
  RefreshControl,
  Platform,
  UIManager,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { GetMenuActiveResponse, Item } from "../../types/index";
import { API_ENDPOINTS } from "../../config/index";
import { useDebounce } from "../../hooks/useDebounce";
import { useViewPermission } from "../../hooks/useViewPermission";
import IsLoading from "../../components/ui/IconLoading";
import EmptyState from "../../components/ui/EmptyState";
import ReportView from "../../components/report/ReportView";
import { callApi } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { removeVietnameseTones } from "../../utils/Helper";
import AssetMenuDropdownItem from "./shared/AssetMenuDropdownItem";
import AssetMenuSearchBar from "./shared/AssetMenuSearchBar";
import {
  buildAssetMenuTree,
  filterAssetMenuTree,
} from "./shared/assetMenuHelpers";
import {
  ASSET_MENU_BG,
  ASSET_MENU_BRAND_RED,
} from "./shared/assetMenuTheme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssetScreen() {
  const { canView, loaded } = useViewPermission();
  const hasViewPermission = loaded && canView("TaiSan");
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [reportItem, setReportItem] = useState<Item | null>(null);
  const [comingSoonReportItem, setComingSoonReportItem] = useState<Item | null>(
    null,
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted } = useSafeAlert();

  const assetMenuMap = useMemo(() => {
    const map: Record<string | number, Item> = {};

    const walk = (items: Item[]) => {
      items.forEach((item) => {
        map[item.id] = item;
        if (item.children?.length) {
          walk(item.children);
        }
      });
    };

    walk(data);
    return map;
  }, [data]);

  const isCnttReport = useCallback(
    (item: Item) => {
      let current: Item | undefined = item;

      while (current) {
        const normalizedLabel = removeVietnameseTones(current.label)
          .trim()
          .toUpperCase();

        if (normalizedLabel === "CNTT") {
          return true;
        }

        current =
          current.parent === null ? undefined : assetMenuMap[current.parent];
      }

      return false;
    },
    [assetMenuMap],
  );

  const handleShowReport = useCallback(
    (item: Item) => {
      if (!isCnttReport(item)) {
        setComingSoonReportItem(item);
        return;
      }

      setReportItem(item);
    },
    [isCnttReport],
  );

  // ── Fetch ──
  const fetchData = useCallback(async (options?: { isRefresh?: boolean }) => {
    if (fetchingRef.current) return;

    const isRefresh = options?.isRefresh;
    fetchingRef.current = true;
    try {
      if (!isRefresh) {
        setIsFetching(true);
      }
      const response = (await callApi(
        "POST",
        API_ENDPOINTS.GET_MENU_ACTIVE,
        {},
      )) as GetMenuActiveResponse;
      if (!Array.isArray(response?.data)) throw new Error("Invalid data");
      const menuAccount = response.data
        .filter((item) => item.iD_GroupMenu === 2)
        .sort((a, b) => Number(a.stt) - Number(b.stt));
      setData(buildAssetMenuTree(menuAccount));
      setLoadErrorMessage(null);
    } catch (e) {
      error("API error:", e);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại.",
      );
    } finally {
      fetchingRef.current = false;
      if (isMounted()) {
        setIsFetching(false);
        setIsRefreshingTop(false);
      }
    }
  }, [isMounted]);

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    await fetchData({ isRefresh: true });
  };

  useEffect(() => {
    if (!loaded || !hasViewPermission) {
      setIsFetching(false);
      return;
    }
    fetchData();
  }, [loaded, hasViewPermission, fetchData]);
  useNetworkAwareReload(() => {
    if (!loaded || !hasViewPermission) return;
    fetchData();
  }, {
    enabled: loaded && hasViewPermission,
    hasError: Boolean(loadErrorMessage),
    onOffline: () => {
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại.",
      );
    },
  });

  // ── Search + auto expand ──
  const { filteredData, autoExpanded } = useMemo(
    () => filterAssetMenuTree(data, debouncedSearch),
    [debouncedSearch, data],
  );

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

  if (!loaded) return <IsLoading size="large" color={ASSET_MENU_BRAND_RED} />;

  if (!hasViewPermission) {
    return (
      <KeyboardAvoidingView
        style={s.centerState}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          title="Bạn không có quyền truy cập"
          subtitle="Tài khoản hiện tại không có quyền xem danh sách tài sản."
        />
      </KeyboardAvoidingView>
    );
  }

  if (isFetching && !isRefreshingTop && !debouncedSearch) {
    return <IsLoading size="large" color={ASSET_MENU_BRAND_RED} />;
  }

  if (loadErrorMessage) {
    return (
      <KeyboardAvoidingView
        style={s.centerState}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Tài sản"
          subtitle={loadErrorMessage}
        />
      </KeyboardAvoidingView>
    );
  }

  const isEmpty = filteredData.length === 0;
  const hasSearch = Boolean(debouncedSearch.trim());

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AssetMenuSearchBar
        value={search}
        onChangeText={setSearch}
        isSearching={isSearching}
        resultCount={filteredData.length}
        showResultCount={Boolean(debouncedSearch.trim())}
      />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AssetMenuDropdownItem
            item={item}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onShowReport={handleShowReport}
            isSearching={!!debouncedSearch}
          />
        )}
        contentContainerStyle={[
          s.listContent,
          isEmpty && s.listContentEmpty,
        ]}
        removeClippedSubviews
        initialNumToRender={20}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={[ASSET_MENU_BRAND_RED]}
            tintColor={ASSET_MENU_BRAND_RED}
            progressViewOffset={50}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName="search-outline"
            title={
              hasSearch
                ? "Không tìm thấy kết quả"
                : "Chưa có dữ liệu tài sản"
            }
            subtitle={
              hasSearch
                ? "Thử tìm kiếm với từ khóa khác"
                : "Danh sách tài sản sẽ hiển thị tại đây khi có dữ liệu."
            }
          />
        }
      />

      <Modal
        visible={!!reportItem}
        animationType="slide"
        onRequestClose={() => setReportItem(null)}
      >
        {reportItem && (
          <ReportView
            title={reportItem.label}
            previewEndpoint={API_ENDPOINTS.PREVIEW_MAYTINH_THONGKE_CNTT}
            onClose={() => setReportItem(null)}
          />
        )}
      </Modal>

      <Modal
        visible={!!comingSoonReportItem}
        animationType="slide"
        onRequestClose={() => setComingSoonReportItem(null)}
      >
        <View style={s.comingSoonContainer}>
          <View
            style={[
              s.comingSoonHeader,
              Platform.OS === "ios"
                ? s.comingSoonHeaderIos
                : s.comingSoonHeaderAndroid,
            ]}
          >
            <Text style={s.comingSoonTitle}>
              {comingSoonReportItem?.label || "Thông báo"}
            </Text>

            <TouchableOpacity onPress={() => setComingSoonReportItem(null)}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <EmptyState
            iconName="notifications-outline"
            title="Tính năng sắp được triển khai"
            subtitle="Báo cáo này chưa khả dụng trên ứng dụng."
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ASSET_MENU_BG,
  },
  centerState: {
    flex: 1,
    backgroundColor: ASSET_MENU_BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  listContentEmpty: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  comingSoonContainer: {
    flex: 1,
    backgroundColor: ASSET_MENU_BG,
  },
  comingSoonHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: ASSET_MENU_BRAND_RED,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comingSoonHeaderIos: {
    paddingTop: 50,
  },
  comingSoonHeaderAndroid: {
    paddingTop: 20,
  },
  comingSoonTitle: {
    flex: 1,
    paddingRight: 12,
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});
