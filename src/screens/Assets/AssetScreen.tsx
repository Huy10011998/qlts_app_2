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
import type {
  GetConfigReportResponse,
  GetMenuActiveResponse,
  Item,
  ReportConfigData,
} from "../../types/index";
import { API_ENDPOINTS, BASE_URL } from "../../config/index";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import { filterReportPermissionTree } from "../../hooks/shared/permissionHelpers";
import IsLoading from "../../components/ui/IconLoading";
import EmptyState from "../../components/ui/EmptyState";
import ReportView from "../../components/report/ReportView";
import { callApi, getConfigReport } from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useParams } from "../../hooks/useParams";
import AssetMenuDropdownItem from "./shared/AssetMenuDropdownItem";
import AssetMenuSearchBar from "./shared/AssetMenuSearchBar";
import {
  buildAssetMenuTree,
  filterMobileAssetMenuTree,
  filterAssetMenuTree,
} from "./shared/assetMenuHelpers";
import { ASSET_MENU_BG, ASSET_MENU_BRAND_RED } from "./shared/assetMenuTheme";
import { C } from "../../utils/helpers/colors";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ActiveReport = {
  config: ReportConfigData;
  item: Item;
  previewEndpoint: string;
};

const buildReportPreviewEndpoint = (direct: string) => {
  const normalizedDirect = direct.trim().replace(/^\/+/, "");
  return `${BASE_URL}/${normalizedDirect}`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssetScreen() {
  const {
    groupMenuId = 2,
    titleHeader = "Tài sản",
    viewPermission = "TaiSan",
  } = useParams<"Asset">();
  const { canView, isFullPermission, loaded, permissions } = usePermission();
  const hasViewPermission = loaded && canView(viewPermission);
  const normalizedTitle = titleHeader || "Tài sản";
  const normalizedTitleLower = normalizedTitle.toLowerCase();
  const isFullAccess = isFullPermission();
  const [data, setData] = useState<Item[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);
  const [comingSoonReportItem, setComingSoonReportItem] = useState<Item | null>(
    null
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted } = useSafeAlert();
  const permissionsRef = useRef(permissions);
  const isFullAccessRef = useRef(isFullAccess);

  permissionsRef.current = permissions;
  isFullAccessRef.current = isFullAccess;

  const handleShowReport = useCallback(
    async (item: Item) => {
      const reportName = item.contentName_Mobile?.trim();

      log("[AssetScreen] Select report", {
        id: item.id,
        label: item.label,
        isReport: item.isReport,
        contentName_Mobile: item.contentName_Mobile,
      });

      if (!item.isReport || !reportName) {
        log("[AssetScreen] Missing report mobile config", {
          id: item.id,
          label: item.label,
        });
        setComingSoonReportItem(item);
        return;
      }

      try {
        log("[AssetScreen] Calling getConfigReport", { nameReport: reportName });
        const configResponse =
          await getConfigReport<GetConfigReportResponse>(reportName);
        const config = configResponse?.data;
        const direct = config?.report?.direct?.trim();

        log("[AssetScreen] getConfigReport success", {
          nameReport: reportName,
          response: configResponse,
        });

        if (!config?.report || !direct) {
          throw new Error("Invalid report config");
        }

        setActiveReport({
          item,
          config,
          previewEndpoint: buildReportPreviewEndpoint(direct),
        });
      } catch (e) {
        error("Get config report error:", e);
        setComingSoonReportItem(item);
      }
    },
    []
  );

  // ── Fetch ──
  const fetchData = useCallback(
    async (options?: { isRefresh?: boolean }) => {
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
          {}
        )) as GetMenuActiveResponse;
        if (!Array.isArray(response?.data)) throw new Error("Invalid data");
        const menuAccount = response.data
          .filter((item) => item.iD_GroupMenu === groupMenuId)
          .sort((a, b) => Number(a.stt) - Number(b.stt));
        const permissionFilteredTree = filterReportPermissionTree(
          buildAssetMenuTree(menuAccount),
          permissionsRef.current,
          isFullAccessRef.current
        );

        setData(
          Platform.OS === "web"
            ? permissionFilteredTree
            : filterMobileAssetMenuTree(permissionFilteredTree)
        );
        setLoadErrorMessage(null);
      } catch (e) {
        error("API error:", e);
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại."
        );
      } finally {
        fetchingRef.current = false;
        if (isMounted()) {
          setIsFetching(false);
          setIsRefreshingTop(false);
        }
      }
    },
    [groupMenuId, isMounted]
  );

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
  useNetworkAwareReload(
    () => {
      if (!loaded || !hasViewPermission) return;
      fetchData();
    },
    {
      enabled: loaded && hasViewPermission,
      hasError: Boolean(loadErrorMessage),
      refetchOnAppResume: false,
      onOffline: () => {
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại."
        );
      },
    }
  );

  // ── Search + auto expand ──
  const { filteredData, autoExpanded } = useMemo(
    () => filterAssetMenuTree(data, debouncedSearch),
    [debouncedSearch, data]
  );

  useEffect(() => {
    if (debouncedSearch.trim()) setExpandedIds(autoExpanded);
    else setExpandedIds([]);
  }, [debouncedSearch, autoExpanded]);

  const handleToggle = (id: string | number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
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
          subtitle={`Tài khoản hiện tại không có quyền xem danh sách ${normalizedTitleLower}.`}
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
          title={`Không thể tải dữ liệu ${normalizedTitle}`}
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
        contentContainerStyle={[s.listContent, isEmpty && s.listContentEmpty]}
        removeClippedSubviews={Platform.OS === "android"}
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
                : `Chưa có dữ liệu ${normalizedTitleLower}`
            }
            subtitle={
              hasSearch
                ? "Thử tìm kiếm với từ khóa khác"
                : `Danh sách ${normalizedTitleLower} sẽ hiển thị tại đây khi có dữ liệu.`
            }
          />
        }
      />

      <Modal
        visible={!!activeReport}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
        onRequestClose={() => setActiveReport(null)}
      >
        <View style={s.reportModalBackdrop}>
          {activeReport && (
            <ReportView
              title={activeReport.config.report.moTa || activeReport.item.label}
              config={activeReport.config}
              previewEndpoint={activeReport.previewEndpoint}
              onClose={() => setActiveReport(null)}
            />
          )}
        </View>
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
            title="Chưa khai báo thông tin Report mobile"
            subtitle="Vui lòng liên hệ quản trị viên để cấu hình báo cáo này."
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
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: C.surface,
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
