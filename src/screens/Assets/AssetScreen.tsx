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
  LayoutAnimation,
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
import { useDismissableModal } from "../../hooks/useDismissableModal";
import { usePermission } from "../../hooks/usePermission";
import { filterReportPermissionTree } from "../../hooks/shared/permissionHelpers";
import EmptyState from "../../components/ui/EmptyState";
import ReportView from "../../components/report/ReportView";
import { callApi, getConfigReport } from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useParams } from "../../hooks/useParams";
import AssetMenuDropdownItem from "./shared/AssetMenuDropdownItem";
import MenuTreeRecents from "../../components/menuTree/MenuTreeRecents";
import MenuTreeSearchBar from "../../components/menuTree/MenuTreeSearchBar";
import MenuCardSkeleton from "../../components/ui/MenuCardSkeleton";
import { shouldShowListSkeleton } from "../../components/ui/shouldShowListSkeleton";
import { useMenuTreeState } from "../../components/menuTree/useMenuTreeState";
import { collectTreeNodes } from "../../components/menuTree/collectTreeNodes";
import {
  useAssetMenuNavigate,
  type AssetMenuTarget,
} from "./shared/useAssetMenuNavigate";
import {
  buildAssetMenuTree,
  filterMobileAssetMenuTree,
  filterAssetMenuTree,
} from "./shared/assetMenuHelpers";
import { ASSET_MENU_BRAND_RED } from "./shared/assetMenuTheme";
import { useAppColors } from "../../utils/helpers/colors";

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

/**
 * Mở lại app sau khoảng này thì cây menu được tải lại: quyền hoặc cấu hình menu
 * có thể đã đổi ở phía quản trị, treo app cả ngày rồi dùng tiếp sẽ thấy bản cũ.
 */
const MENU_STALE_MS = 10 * 60 * 1000;

const buildReportPreviewEndpoint = (direct: string) => {
  const normalizedDirect = direct.trim().replace(/^\/+/, "");
  return `${BASE_URL}/${normalizedDirect}`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssetScreen() {
  const colors = useAppColors();
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
  const {
    content: activeReport,
    visible: isReportVisible,
    open: openActiveReport,
    close: closeActiveReport,
    handleDismiss: handleReportDismiss,
  } = useDismissableModal<ActiveReport>();
  const [comingSoonReportItem, setComingSoonReportItem] = useState<Item | null>(
    null
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted } = useSafeAlert();
  const permissionsRef = useRef(permissions);
  const isFullAccessRef = useRef(isFullAccess);

  permissionsRef.current = permissions;
  isFullAccessRef.current = isFullAccess;

  const handleShowReport = useCallback(async (item: Item) => {
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
      const configResponse = await getConfigReport<GetConfigReportResponse>(
        reportName
      );
      const config = configResponse?.data;
      const direct = config?.report?.direct?.trim();

      log("[AssetScreen] getConfigReport success", {
        nameReport: reportName,
        response: configResponse,
      });

      if (!config?.report || !direct) {
        throw new Error("Invalid report config");
      }

      openActiveReport({
        item,
        config,
        previewEndpoint: buildReportPreviewEndpoint(direct),
      });
    } catch (e) {
      error("Get config report error:", e);
      setComingSoonReportItem(item);
    }
  }, [openActiveReport]);

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
        lastLoadedAtRef.current = Date.now();
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

      // Đang lỗi thì tải lại ngay; còn lại chỉ tải khi dữ liệu đã cũ, để mở lại
      // app liên tục không thành gọi API liên tục.
      const isStale = Date.now() - lastLoadedAtRef.current > MENU_STALE_MS;
      if (!loadErrorMessage && !isStale) return;

      fetchData();
    },
    {
      enabled: loaded && hasViewPermission,
      hasError: Boolean(loadErrorMessage),
      refetchOnAppResume: true,
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
  const hasSearch = Boolean(debouncedSearch.trim());

  // Trạng thái gập/mở: tập tạm khi đang tìm kiếm, tập đã lưu khi không — nên xoá
  // từ khoá là danh sách trở về đúng những nhóm người dùng tự mở trước đó.
  const { recents, rememberRecent, expandedIds, toggleExpanded, collapseAll } =
    useMenuTreeState<AssetMenuTarget>(`asset:${groupMenuId}`, {
      hasSearch,
      autoExpanded,
    });

  // Đối chiếu với cây đầy đủ (đã lọc quyền), không phải cây đang lọc theo từ khoá.
  const availableNodes = useMemo(() => collectTreeNodes(data), [data]);

  const handleCollapseAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    collapseAll();
  };

  useEffect(() => {
    setIsSearching(search !== debouncedSearch);
  }, [search, debouncedSearch]);

  const openMenuItem = useAssetMenuNavigate({
    onShowReport: handleShowReport,
    onOpened: rememberRecent,
  });

  // Chờ quyền cũng dùng khung chờ như chờ dữ liệu: hai nhánh khác kiểu thì vào
  // màn thấy vòng xoay nhảy sang khung xám rồi mới ra nội dung.
  if (!loaded) return <MenuCardSkeleton />;

  if (!hasViewPermission) {
    return (
      <KeyboardAvoidingView
        style={[s.centerState, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          title="Bạn không có quyền truy cập"
          subtitle={`Tài khoản hiện tại không có quyền xem danh sách ${normalizedTitleLower}.`}
        />
      </KeyboardAvoidingView>
    );
  }

  if (
    shouldShowListSkeleton({
      isFetching,
      isEmpty: data.length === 0,
      isRefreshing: isRefreshingTop,
      isSearching: Boolean(debouncedSearch),
    })
  ) {
    return <MenuCardSkeleton />;
  }

  if (loadErrorMessage) {
    return (
      <KeyboardAvoidingView
        style={[s.centerState, { backgroundColor: colors.bg }]}
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

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <MenuTreeSearchBar
        value={search}
        onChangeText={setSearch}
        isSearching={isSearching}
        placeholder="Tìm kiếm tài sản..."
        resultCount={filteredData.length}
        showResultCount={Boolean(debouncedSearch.trim())}
        onCollapseAll={expandedIds.length > 0 ? handleCollapseAll : undefined}
      />

      {hasSearch ? null : (
        <MenuTreeRecents
          recents={recents}
          onPressItem={openMenuItem}
          nodeById={availableNodes}
        />
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AssetMenuDropdownItem
            item={item}
            expandedIds={expandedIds}
            onToggle={toggleExpanded}
            onOpenItem={openMenuItem}
            isSearching={!!debouncedSearch}
            searchText={debouncedSearch}
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
                ? `Không có mục nào khớp "${debouncedSearch.trim()}".`
                : `Danh sách ${normalizedTitleLower} sẽ hiển thị tại đây khi có dữ liệu.`
            }
            actionLabel={hasSearch ? "Xoá từ khoá" : undefined}
            onActionPress={hasSearch ? () => setSearch("") : undefined}
          />
        }
      />

      <Modal
        visible={isReportVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
        onDismiss={handleReportDismiss}
        onRequestClose={closeActiveReport}
      >
        <View
          style={[s.reportModalBackdrop, { backgroundColor: colors.surface }]}
        >
          {activeReport && (
            <ReportView
              title={activeReport.config.report.moTa || activeReport.item.label}
              config={activeReport.config}
              previewEndpoint={activeReport.previewEndpoint}
              onClose={closeActiveReport}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={!!comingSoonReportItem}
        animationType="slide"
        onRequestClose={() => setComingSoonReportItem(null)}
      >
        <View style={[s.comingSoonContainer, { backgroundColor: colors.bg }]}>
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
  },
  reportModalBackdrop: {
    flex: 1,
  },
  centerState: {
    flex: 1,
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
