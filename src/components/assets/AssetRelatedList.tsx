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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
        Alert.alert("Lỗi", "Không thể tải dữ liệu");
        if (!isLoadMore) setData([]);
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsSearching(false);
        setIsRefreshingTop(false);
        setIsFirstLoad(false);
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
      if (isSearch) setIsSearching(false);
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
    return <IsLoading size="large" color="#FF3333" />;
  }
  return (
    <View style={{ flex: 1 }}>
      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm..."
          value={searchText}
          placeholderTextColor="#999"
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        {isSearching && (
          <IsLoading
            size="small"
            color="#FF3333"
            style={styles.searchSpinner}
          />
        )}
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
            colors={["#FF3333"]}
            tintColor="#FF3333"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              Tổng: {total} (Đã tải: {data.length})
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
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
  searchWrapper: {
    position: "relative",
    margin: 12,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 36,
    color: "#333",
  },

  searchSpinner: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -10,
  },

  header: {
    textAlign: "center",
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },

  stickyHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    zIndex: 10,
  },
});
