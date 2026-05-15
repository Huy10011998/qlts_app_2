import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Platform,
  UIManager,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { GetMenuActiveResponse, Item } from "../../types/Index";
import { API_ENDPOINTS } from "../../config/Index";
import { useDebounce } from "../../hooks/useDebounce";
import { useViewPermission } from "../../hooks/useViewPermission";
import IsLoading from "../../components/ui/IconLoading";
import EmptyState from "../../components/ui/EmptyState";
import ReportView from "../../components/report/ReportView";
import { callApi } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
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

  const fetchingRef = useRef(false);
  const firstLoadRef = useRef(true);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
    } catch (e) {
      error("API error:", e);
      showAlertIfActive("Lỗi", "Không thể tải dữ liệu menu.");
    } finally {
      fetchingRef.current = false;
      if (isMounted()) {
        setIsFetching(false);
        setIsRefreshingTop(false);
      }
    }
  }, [isMounted, showAlertIfActive]);

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
  useAutoReload(() => {
    if (!loaded || !hasViewPermission) return;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    fetchData();
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

  const isEmpty = filteredData.length === 0;

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
            onShowReport={setReportItem}
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
            title="Không tìm thấy kết quả"
            subtitle="Thử tìm kiếm với từ khóa khác"
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
            onClose={() => setReportItem(null)}
          />
        )}
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
});
