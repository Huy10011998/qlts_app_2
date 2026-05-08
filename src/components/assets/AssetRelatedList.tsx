import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import {
  Field,
  PropertyResponse,
  AssetDetailsNavigationProp,
  StackRoute,
  mapPropertyResponseToPropertyClass,
} from "../../types/Index";
import {
  getFieldActive,
  getList,
  getPropertyClass,
} from "../../services/Index";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { SqlOperator, TypeProperty } from "../../utils/Enum";
import { useDebounce } from "../../hooks/useDebounce";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";
import { usePermission } from "../../hooks/usePermission";
import { RelatedAddItem } from "../add/RelatedAddItem";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/Hooks";
import { resetShouldRefreshList } from "../../store/AssetSlice";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/CallApi";
import Ionicons from "react-native-vector-icons/Ionicons";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";
const CARD_SHADOW = {
  shadowColor: "#1A2340",
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export default function AssetRelatedList() {
  const route = useRoute<StackRoute<"AssetRelatedList">>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();

  const { nameClass, idRoot, propertyReference, nameClassRoot } = route.params;

  if (!nameClass || !idRoot || !propertyReference) {
    Alert.alert("Lỗi", "Thiếu param bắt buộc");
    return null;
  }

  // ===== CONDITIONS CỐ ĐỊNH =====
  const conditions = useMemo(
    () => [
      {
        property: propertyReference,
        operator: SqlOperator.Equals,
        value: String(idRoot),
        type: TypeProperty.Int,
      },
    ],
    [propertyReference, idRoot],
  );

  // ===== STATE =====
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");

  const debouncedSearch = useDebounce(searchText, 600);
  const pageSize = 20;

  // ===== REF =====
  const skipRef = useRef(0);
  const isFetchingRef = useRef(false);

  const { can, loaded } = usePermission();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const dispatch = useAppDispatch();

  // ===== FETCH DATA (GIỐNG ASSETLIST) =====
  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (isFetchingRef.current) return;

      const isRefresh = options?.isRefresh;

      if (!isLoadMore && !isRefresh && isFirstLoad) {
        setIsLoading(true);
      }

      try {
        isFetchingRef.current = true;

        if (!isLoadMore && fieldActive.length === 0) {
          const resField = await getFieldActive(nameClass);
          const fields = resField?.data || [];
          setFieldActive(fields);
          setFieldShowMobile(fields.filter((f: Field) => f.isShowMobile));
        }

        if (!isLoadMore && !propertyClass) {
          const resProp = await getPropertyClass(nameClass);
          setPropertyClass(resProp?.data);
        }

        const currentSkip = isLoadMore ? skipRef.current : 0;

        const res = await getList(
          nameClass,
          "",
          pageSize,
          currentSkip,
          debouncedSearch,
          conditions,
          [],
        );

        const items = res?.data?.items || [];
        const totalCount = res?.data?.totalCount || 0;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isLoadMore) {
          setData((prev) => {
            const map = new Map<string, any>();
            [...prev, ...items].forEach((i) => map.set(String(i.id), i));
            return Array.from(map.values());
          });
          skipRef.current = currentSkip + pageSize;
        } else {
          setData(items);
          skipRef.current = pageSize;
        }

        setTotal(totalCount);
      } catch (e) {
        error(e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu");
        }
        if (!isLoadMore) setData([]);
      } finally {
        isFetchingRef.current = false;
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsSearching(false);
          setIsRefreshingTop(false);
          setIsFirstLoad(false);
        }
      }
    },
    [
      nameClass,
      propertyClass,
      debouncedSearch,
      conditions,
      fieldActive.length,
      isFirstLoad,
    ],
  );

  useAutoReload(fetchData);

  // ===== SEARCH / RELOAD =====
  useEffect(() => {
    const isSearch = debouncedSearch.trim().length > 0;

    if (isSearch) setIsSearching(true);

    skipRef.current = 0;
    setData([]);
    setIsLoading(true);

    fetchData(false).finally(() => {
      if (isSearch && isMounted()) setIsSearching(false);
    });
  }, [debouncedSearch]);

  // ===== REFRESH TOP =====
  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    skipRef.current = 0;

    await fetchData(false, { isRefresh: true });
  };

  // ===== LOAD MORE =====
  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || isSearching || data.length >= total)
      return;

    setIsLoadingMore(true);
    fetchData(true);
  };

  const handlePress = (item: Record<string, any>) => {
    navigation.navigate("AssetRelatedDetails", {
      id: String(item.id),
      field: JSON.stringify(fieldActive),
      nameClass,
      propertyClass,
    });
  };

  const shouldRefresh = useSelector(
    (state: RootState) => state.asset.shouldRefreshList,
  );

  // Redux
  useFocusEffect(
    React.useCallback(() => {
      if (shouldRefresh) {
        fetchData(false);
        dispatch(resetShouldRefreshList());
      }
    }, [shouldRefresh]),
  );

  if (
    isLoading &&
    !isRefreshingTop &&
    !isLoadingMore &&
    !isSearching // thêm điều kiện này
  ) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }
  return (
    <View style={styles.container}>
      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search-outline" size={16} color="#8A95A3" />
          </View>
          <TextInput
            placeholder="Tìm kiếm dữ liệu liên quan..."
            value={searchText}
            placeholderTextColor="#B0B8C4"
            onChangeText={setSearchText}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {isSearching && (
            <View style={styles.spinnerWrap}>
              <IsLoading size="small" color={BRAND_RED} />
            </View>
          )}
          {!isSearching && searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={16} color="#B0B8C4" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>Dữ liệu liên quan</Text>
          </View>
          <Text style={styles.summaryMeta}>
            Tổng {total} • Đã tải {data.length}
          </Text>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListCardAsset
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={[BRAND_RED]}
            tintColor={BRAND_RED}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <View style={styles.filterCard}>
              <View style={styles.filterCardIcon}>
                <Ionicons name="link-outline" size={16} color={BRAND_RED} />
              </View>
              <View style={styles.filterCardContent}>
                <Text style={styles.filterCardTitle} numberOfLines={1}>
                  Danh sách liên quan
                </Text>
                <Text style={styles.filterCardSub}>
                  {total} kết quả • hiển thị {data.length}
                </Text>
              </View>
            </View>
          </View>
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="albums-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>Không có dữ liệu liên quan</Text>
            <Text style={styles.emptySub}>
              Thử tìm kiếm bằng từ khóa khác hoặc thêm mới dữ liệu liên kết
            </Text>
          </View>
        }
      />

      {loaded && can(nameClass, "Insert") && (
        <RelatedAddItem
          onPress={() =>
            navigation.navigate("AssetAddRelatedItem", {
              field: JSON.stringify(fieldActive),
              nameClass,
              propertyClass: mapPropertyResponseToPropertyClass(propertyClass),
              idRoot,
              nameClassRoot,
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    ...CARD_SHADOW,
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
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  summaryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    flexShrink: 1,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: BRAND_RED,
  },
  summaryMeta: {
    fontSize: 11.5,
    color: "#8A95A3",
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 24,
  },
  stickyHeader: {
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
    zIndex: 10,
  },
  filterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    ...CARD_SHADOW,
  },
  filterCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    marginRight: 10,
  },
  filterCardContent: {
    flex: 1,
  },
  filterCardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F1923",
    marginBottom: 2,
  },
  filterCardSub: {
    fontSize: 11.5,
    color: "#8A95A3",
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
