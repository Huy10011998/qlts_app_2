import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";

import { useDebounce } from "../../hooks/useDebounce";
import { useViewPermission } from "../../hooks/useViewPermission";
import IsLoading from "../../components/ui/IconLoading";
import { getVungCamera } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import CameraMenuDropdownItem from "./shared/CameraMenuDropdownItem";
import CameraMenuSearchBar from "./shared/CameraMenuSearchBar";
import {
  buildCameraTree,
  CameraItem,
  filterCameraTree,
} from "./shared/cameraMenuHelpers";
import {
  CAMERA_MENU_BG,
  CAMERA_MENU_BRAND_RED,
} from "./shared/cameraMenuTheme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CameraScreen() {
  const { canView, loaded } = useViewPermission();
  const hasViewPermission = loaded && canView("Camera");
  const [data, setData] = useState<CameraItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);

  const fetchingRef = useRef(false);
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const fetchData = async (options?: { isRefresh?: boolean }) => {
    if (fetchingRef.current) return;

    const isRefresh = options?.isRefresh;
    fetchingRef.current = true;
    if (!isRefresh) {
      setIsFetching(true);
    }

    try {
      const response: any = await getVungCamera();

      setRawData(response.data);
      setData(buildCameraTree(response.data));
    } catch (e) {
      error("API error:", e);
      showAlertIfActive("Lỗi", "Không tải được dữ liệu camera.");
    } finally {
      fetchingRef.current = false;
      if (isMounted()) {
        setIsFetching(false);
        setIsRefreshingTop(false);
      }
    }
  };

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
  }, [loaded, hasViewPermission]);

  const { filteredTree, autoExpand } = useMemo(
    () => filterCameraTree(data, debouncedSearch),
    [debouncedSearch, data],
  );

  useEffect(() => {
    if (debouncedSearch.trim()) {
      setExpandedIds(autoExpand);
    }
  }, [autoExpand, debouncedSearch]);

  const handleToggle = (id: string) => {
    if (!debouncedSearch) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [search, debouncedSearch]);
  if (!loaded) return <IsLoading size="large" color={CAMERA_MENU_BRAND_RED} />;

  if (!hasViewPermission) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, styles.centerState]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.emptyTitle}>Bạn không có quyền truy cập</Text>
        <Text style={styles.emptySub}>
          Tài khoản hiện tại không có quyền xem danh sách camera.
        </Text>
      </KeyboardAvoidingView>
    );
  }

  if (isFetching && !isRefreshingTop && !debouncedSearch)
    return <IsLoading size="large" color={CAMERA_MENU_BRAND_RED} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <CameraMenuSearchBar
          value={search}
          onChangeText={setSearch}
          isSearching={isSearching}
          resultCount={filteredTree.length}
          showResultCount={Boolean(debouncedSearch.trim())}
        />

        <FlatList
          data={filteredTree}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CameraMenuDropdownItem
              item={item}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              rawData={rawData}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filteredTree.length === 0 && styles.listContentEmpty,
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
              colors={["#E31E24"]}
              tintColor={CAMERA_MENU_BRAND_RED}
              progressViewOffset={50}
            />
          }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CAMERA_MENU_BG,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  listContentEmpty: {
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
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
