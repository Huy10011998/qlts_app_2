import {
  useAppColors,
  useHairlineBorderColor,
  useSchemeColor,
} from "../../utils/helpers/colors";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { API_ENDPOINTS, BASE_URL } from "../../config/index";
import { useDebounce } from "../../hooks/useDebounce";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { usePermission } from "../../hooks/usePermission";
import { filterReportPermissionTree } from "../../hooks/shared/permissionHelpers";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import ReportView from "../../components/report/ReportView";
import IsLoading from "../../components/ui/IconLoading";
import EmptyState from "../../components/ui/EmptyState";
import { callApi, getConfigReport } from "../../services/data/callApi";
import type {
  GetConfigReportResponse,
  GetMenuActiveResponse,
  Item,
  ReportConfigData,
} from "../../types/index";
import { error, log } from "../../utils/Logger";
import { removeVietnameseTones } from "../../utils/Helper";
import { useParams } from "../../hooks/useParams";
import AssetMenuSearchBar from "../Assets/shared/AssetMenuSearchBar";
import { buildAssetMenuTree } from "../Assets/shared/assetMenuHelpers";
import { ASSET_MENU_BRAND_RED } from "../Assets/shared/assetMenuTheme";

type ReportListItem = {
  groupTitle: string;
  id: string;
  item: Item;
  path: string;
};

type ReportSection = {
  data: ReportListItem[];
  title: string;
};

type ActiveReport = {
  config: ReportConfigData;
  item: Item;
  previewEndpoint: string;
};

const buildReportPreviewEndpoint = (direct: string) => {
  const normalizedDirect = direct.trim().replace(/^\/+/, "");
  return `${BASE_URL}/${normalizedDirect}`;
};

function buildReportList(items: Item[]) {
  const reports: ReportListItem[] = [];

  const walk = (nodes: Item[], parentLabels: string[]) => {
    nodes.forEach((node) => {
      const nextPath = [...parentLabels, node.label];

      if (node.isReport) {
        reports.push({
          groupTitle: parentLabels[0] || "Báo cáo tài sản",
          id: String(node.id),
          item: node,
          path: parentLabels.join(" > "),
        });
      }

      if (node.children?.length) {
        walk(node.children, nextPath);
      }
    });
  };

  walk(items, []);
  return reports;
}

function buildReportSections(reports: ReportListItem[]) {
  const sectionMap = new Map<string, ReportSection>();

  reports.forEach((report) => {
    const title = report.groupTitle;
    const currentSection = sectionMap.get(title);

    if (currentSection) {
      currentSection.data.push(report);
      return;
    }

    sectionMap.set(title, {
      title,
      data: [report],
    });
  });

  return Array.from(sectionMap.values());
}

function ReportGroupHeader({ section }: { section: ReportSection }) {
  const redBorderColor = useSchemeColor("#FECACA", "#65343B");
  const colors = useAppColors();

  return (
    <View style={[s.groupHeader, { backgroundColor: colors.bg }]}>
      <View style={s.groupTitleWrap}>
        <View style={s.groupIconWrap}>
          <Ionicons name="folder-open-outline" size={15} color="#fff" />
        </View>
        <Text style={[s.groupTitle, { color: colors.text }]} numberOfLines={1}>
          {section.title}
        </Text>
      </View>
      <Text
        style={[
          s.groupCount,
          { backgroundColor: colors.redSurface, borderColor: redBorderColor },
        ]}
      >
        {section.data.length} báo cáo
      </Text>
    </View>
  );
}

function ReportListCard({
  report,
  onPress,
}: {
  report: ReportListItem;
  onPress: (item: Item) => void;
}) {
  const hairlineBorderColor = useHairlineBorderColor();
  const violetBorderColor = useSchemeColor("#DDD2FF", "#554778");
  const colors = useAppColors();

  return (
    <TouchableOpacity
      style={[
        s.reportCard,
        {
          backgroundColor: colors.surface,
          borderColor: hairlineBorderColor,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={() => onPress(report.item)}
      activeOpacity={0.76}
    >
      <View style={s.reportAccent} />
      <View
        style={[
          s.reportIconWrap,
          {
            backgroundColor: colors.violetSurface,
            borderColor: violetBorderColor,
          },
        ]}
      >
        <Ionicons name="bar-chart-outline" size={19} color="#7048E8" />
      </View>

      <View style={s.reportTextWrap}>
        <Text style={[s.reportTitle, { color: colors.text }]} numberOfLines={2}>
          {report.item.label}
        </Text>
        <View style={s.reportPathWrap}>
          <Ionicons
            name="git-branch-outline"
            size={12}
            color={colors.textMuted}
          />
          <Text
            style={[s.reportPath, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {report.path || "Báo cáo tài sản"}
          </Text>
        </View>
      </View>

      <View
        style={[s.reportChevronWrap, { backgroundColor: colors.violetSurface }]}
      >
        <Ionicons name="chevron-forward" size={15} color="#7048E8" />
      </View>
    </TouchableOpacity>
  );
}

export default function ReportScreen() {
  const colors = useAppColors();
  const {
    groupMenuId = 2,
    titleHeader = "Tài sản",
    viewPermission = "TaiSan",
  } = useParams<"Report">();
  const { canView, isFullPermission, loaded, permissions } = usePermission();
  const hasViewPermission = loaded && canView(viewPermission);
  const normalizedTitle = titleHeader || "Tài sản";
  const isFullAccess = isFullPermission();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [search, setSearch] = useState("");
  const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchingRef = useRef(false);
  const debouncedSearch = useDebounce(search, 400);
  const [isSearching, setIsSearching] = useState(false);
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const permissionsRef = useRef(permissions);
  const isFullAccessRef = useRef(isFullAccess);

  permissionsRef.current = permissions;
  isFullAccessRef.current = isFullAccess;

  const closeActiveReport = useCallback(() => {
    setActiveReport(null);
  }, []);

  const handleShowReport = useCallback(
    async (item: Item) => {
      const reportName = item.contentName_Mobile?.trim();

      log("[ReportScreen] Select report", {
        id: item.id,
        label: item.label,
        isReport: item.isReport,
        contentName_Mobile: item.contentName_Mobile,
      });

      if (!item.isReport || !reportName) {
        log("[ReportScreen] Missing report mobile config", {
          id: item.id,
          label: item.label,
        });
        showAlertIfActive("Thông báo", "Chưa khai báo thông tin Report mobile");
        return;
      }

      try {
        log("[ReportScreen] Calling getConfigReport", {
          nameReport: reportName,
        });
        const configResponse = await getConfigReport<GetConfigReportResponse>(
          reportName
        );
        const config = configResponse?.data;
        const direct = config?.report?.direct?.trim();

        log("[ReportScreen] getConfigReport success", {
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
        showAlertIfActive("Lỗi", "Không thể tải cấu hình báo cáo.");
      }
    },
    [showAlertIfActive]
  );

  const fetchData = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      if (fetchingRef.current) return;

      const isRefresh = options?.isRefresh;
      fetchingRef.current = true;
      try {
        if (!isRefresh) {
          setIsFetching(true);
        }

        log("[ReportScreen] Calling GET_MENU_ACTIVE");
        const response = (await callApi(
          "POST",
          API_ENDPOINTS.GET_MENU_ACTIVE,
          {}
        )) as GetMenuActiveResponse;

        if (!Array.isArray(response?.data)) throw new Error("Invalid data");
        log("[ReportScreen] GET_MENU_ACTIVE success", {
          totalItems: response.data.length,
        });

        const menuAccount = response.data
          .filter((item) => item.iD_GroupMenu === groupMenuId)
          .sort((a, b) => Number(a.stt) - Number(b.stt));

        const nextReports = buildReportList(
          filterReportPermissionTree(
            buildAssetMenuTree(menuAccount),
            permissionsRef.current,
            isFullAccessRef.current
          )
        );

        log("[ReportScreen] Report menu prepared", {
          menuAccountItems: menuAccount.length,
          reportItems: nextReports.length,
        });

        setReports(nextReports);
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
  }, [fetchData, hasViewPermission, loaded]);

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
        if (activeReport) return;
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại."
        );
      },
    }
  );

  const filteredReports = useMemo(() => {
    const keyword = removeVietnameseTones(debouncedSearch.trim().toLowerCase());

    if (!keyword) return reports;

    return reports.filter((report) => {
      const haystack = removeVietnameseTones(
        `${report.item.label} ${report.path}`.toLowerCase()
      );

      return haystack.includes(keyword);
    });
  }, [debouncedSearch, reports]);

  const reportSections = useMemo(
    () => buildReportSections(filteredReports),
    [filteredReports]
  );

  useEffect(() => {
    setIsSearching(search !== debouncedSearch);
  }, [debouncedSearch, search]);

  if (!loaded) return <IsLoading size="large" color={ASSET_MENU_BRAND_RED} />;

  if (!hasViewPermission) {
    return (
      <KeyboardAvoidingView
        style={[s.centerState, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          iconName="lock-closed-outline"
          title={`Bạn chưa có quyền xem báo cáo ${normalizedTitle}`}
          subtitle={`Tài khoản cần được cấp quyền xem ${normalizedTitle} trước khi truy cập danh sách báo cáo.`}
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
        style={[s.centerState, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải danh sách báo cáo"
          subtitle={loadErrorMessage}
        />
      </KeyboardAvoidingView>
    );
  }

  const isEmpty = filteredReports.length === 0;
  const hasSearch = Boolean(debouncedSearch.trim());
  const emptyTitle = hasSearch
    ? "Không tìm thấy báo cáo"
    : "Bạn chưa được phân quyền báo cáo nào";
  const emptySubtitle = hasSearch
    ? "Thử tìm kiếm với từ khóa khác."
    : "Vui lòng liên hệ quản trị viên để cấp quyền Report cho báo cáo cần sử dụng.";

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AssetMenuSearchBar
        value={search}
        onChangeText={setSearch}
        isSearching={isSearching}
        resultCount={filteredReports.length}
        showResultCount={Boolean(debouncedSearch.trim())}
        placeholder="Tìm kiếm báo cáo..."
      />

      <SectionList
        sections={reportSections}
        keyExtractor={(report) => report.id}
        renderItem={({ item }) => (
          <ReportListCard report={item} onPress={handleShowReport} />
        )}
        renderSectionHeader={({ section }) => (
          <ReportGroupHeader section={section} />
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
            iconName={hasSearch ? "search-outline" : "lock-closed-outline"}
            title={emptyTitle}
            subtitle={emptySubtitle}
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
    </KeyboardAvoidingView>
  );
}

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
    paddingTop: 6,
    paddingBottom: 24,
  },
  listContentEmpty: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 9,
  },
  groupTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    minWidth: 0,
  },
  groupIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: ASSET_MENU_BRAND_RED,
    shadowColor: ASSET_MENU_BRAND_RED,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  groupTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: "700",
    color: ASSET_MENU_BRAND_RED,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#7048E8",
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 20,
  },
  reportPathWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 5,
    gap: 5,
  },
  reportPath: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  reportChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
