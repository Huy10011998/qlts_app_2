import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  View,
  FlatList,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";

import { useDebounce } from "../../hooks/useDebounce";
import { usePermission } from "../../hooks/usePermission";
import EmptyState from "../../components/ui/EmptyState";
import { getVungCamera } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import CameraMenuDropdownItem from "./shared/CameraMenuDropdownItem";
import MenuTreeSearchBar from "../../components/menuTree/MenuTreeSearchBar";
import MenuTreeRecents from "../../components/menuTree/MenuTreeRecents";
import MenuCardSkeleton from "../../components/ui/MenuCardSkeleton";
import { shouldShowListSkeleton } from "../../components/ui/shouldShowListSkeleton";
import { useMenuTreeState } from "../../components/menuTree/useMenuTreeState";
import { collectTreeNodes } from "../../components/menuTree/collectTreeNodes";
import {
  useOpenCameraZone,
  type CameraZoneTarget,
} from "./shared/useOpenCameraZone";
import {
  buildCameraTree,
  CameraItem,
  filterCameraTree,
} from "./shared/cameraMenuHelpers";
import { CAMERA_MENU_BRAND_RED } from "./shared/cameraMenuTheme";

/**
 * Mở lại app sau khoảng này thì cây khu vực được tải lại: khu vực/camera có thể
 * đã được thêm bớt ở phía quản trị.
 */
const CAMERA_TREE_STALE_MS = 10 * 60 * 1000;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CameraScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const isFocused = useIsFocused();
  const { canView, loaded } = usePermission();
  const hasViewPermission = loaded && canView("Camera");
  const [data, setData] = useState<CameraItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const [rawData, setRawData] = useState<any[]>([]);

  const fetchingRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const { isMounted } = useSafeAlert();

  const fetchData = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      if (fetchingRef.current) return;

      const isRefresh = options?.isRefresh;
      fetchingRef.current = true;
      if (!isRefresh) {
        setIsFetching(true);
      }

      try {
        const response: any = await getVungCamera();
        const nextData = Array.isArray(response?.data)
          ? [...response.data]
          : [];

        setRawData(nextData);
        setData(buildCameraTree(nextData));
        lastLoadedAtRef.current = Date.now();
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
    },
    [isMounted],
  );

  // Kéo làm mới chỉ tải lại dữ liệu, KHÔNG thu các nhóm đang mở: người dùng mở
  // khu vực ra xem rồi kéo làm mới thì đóng sạch là mất chỗ đang theo dõi.
  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setLoadErrorMessage(null);
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
      // Đang lỗi thì tải lại ngay; còn lại chỉ tải khi dữ liệu đã cũ, để mở lại
      // app liên tục không thành gọi API liên tục.
      const isStale = Date.now() - lastLoadedAtRef.current > CAMERA_TREE_STALE_MS;
      if (!loadErrorMessage && !isStale) return;

      fetchData();
    },
    {
      enabled: isFocused && loaded && hasViewPermission,
      hasError: Boolean(loadErrorMessage),
      refetchOnAppResume: true,
      onOffline: () => {
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc kéo xuống để thử lại.",
        );
      },
    },
  );

  const { filteredTree, autoExpand } = useMemo(
    () => filterCameraTree(data, debouncedSearch),
    [debouncedSearch, data],
  );
  const hasSearch = Boolean(debouncedSearch.trim());

  // Hai tập gập/mở riêng: tập của người dùng (lưu xuống máy) và tập tạm trong
  // lúc tìm kiếm — xoá từ khoá là trở về đúng khu vực đang mở trước đó.
  const { recents, rememberRecent, expandedIds, toggleExpanded, collapseAll } =
    useMenuTreeState<CameraZoneTarget>("camera", {
      hasSearch,
      autoExpanded: autoExpand,
    });

  const openZone = useOpenCameraZone(rawData, rememberRecent);
  // Đối chiếu với cây đầy đủ, không phải cây đang lọc theo từ khoá.
  const availableNodes = useMemo(() => collectTreeNodes(data), [data]);

  const handleToggle = (id: string) => {
    if (!hasSearch) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    toggleExpanded(id);
  };

  const handleCollapseAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    collapseAll();
  };

  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [search, debouncedSearch]);
  // Chờ quyền cũng dùng khung chờ như chờ dữ liệu: hai nhánh khác kiểu thì vào
  // màn thấy vòng xoay nhảy sang khung xám rồi mới ra nội dung.
  if (!loaded) return <MenuCardSkeleton />;

  if (!hasViewPermission) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, styles.centerState]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          title="Bạn không có quyền truy cập"
          subtitle="Tài khoản hiện tại không có quyền xem danh sách camera."
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
  )
    return <MenuCardSkeleton />;

  if (loadErrorMessage) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, styles.centerState]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <EmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải dữ liệu Camera"
          subtitle={loadErrorMessage}
        />
      </KeyboardAvoidingView>
    );
  }

  const isEmpty = filteredTree.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <MenuTreeSearchBar
          value={search}
          onChangeText={setSearch}
          isSearching={isSearching}
          placeholder="Tìm kiếm camera..."
          resultCount={filteredTree.length}
          showResultCount={hasSearch}
          onCollapseAll={
            expandedIds.length > 0 ? handleCollapseAll : undefined
          }
        />

        {hasSearch ? null : (
          <MenuTreeRecents
            recents={recents}
            onPressItem={openZone}
            iconName="videocam-outline"
            nodeById={availableNodes}
          />
        )}

        <FlatList
          data={filteredTree}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CameraMenuDropdownItem
              item={item}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onOpenZone={openZone}
              searchText={debouncedSearch}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
          ]}
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={20}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingTop}
              onRefresh={refreshTop}
              colors={[c.red]}
              tintColor={CAMERA_MENU_BRAND_RED}
              progressViewOffset={50}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="videocam-outline"
              title={
                hasSearch ? "Không tìm thấy camera" : "Chưa có dữ liệu camera"
              }
              subtitle={
                hasSearch
                  ? `Không có khu vực hay camera nào khớp "${debouncedSearch.trim()}".`
                  : "Danh sách camera sẽ hiển thị tại đây khi có dữ liệu."
              }
              actionLabel={hasSearch ? "Xoá từ khoá" : undefined}
              onActionPress={hasSearch ? () => setSearch("") : undefined}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
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
    centerState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
  });
