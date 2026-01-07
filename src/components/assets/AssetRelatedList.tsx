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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  Field,
  PropertyResponse,
  AssetDetailsNavigationProp,
  AssetListScreenRouteProp,
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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AssetRelatedList() {
  const route = useRoute<AssetListScreenRouteProp>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();

  const { nameClass, idRoot, propertyReference } = route.params;

  if (!nameClass || !idRoot || !propertyReference) {
    Alert.alert("Lỗi", "Thiếu param bắt buộc");
    return null;
  }

  // ===== FILTER CONDITIONS =====
  const conditions = useMemo(() => {
    return [
      {
        property: propertyReference,
        operator: SqlOperator.Equals,
        value: String(idRoot),
        type: TypeProperty.Int,
      },
    ];
  }, [propertyReference, idRoot]);

  // ===== STATE =====
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");

  const debouncedSearch = useDebounce(searchText, 600);
  const pageSize = 20;

  // QUAN TRỌNG: dùng ref cho skip
  const skipRef = useRef(0);
  const isFetchingRef = useRef(false);

  // ===== FETCH DATA =====
  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (isFetchingRef.current) return;

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
          []
        );

        const items = res?.data?.items || [];
        const totalCount = res?.data?.totalCount || 0;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isLoadMore) {
          // CHỐNG TRÙNG ID TUYỆT ĐỐI
          setData((prev) => {
            const map = new Map<string, any>();
            [...prev, ...items].forEach((item) => {
              map.set(String(item.id), item);
            });
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
      }
    },
    [nameClass, propertyClass, debouncedSearch, conditions, fieldActive.length]
  );

  // ===== LOAD + SEARCH =====
  useEffect(() => {
    setIsLoading(true);
    setIsSearching(debouncedSearch.trim().length > 0);
    skipRef.current = 0;
    setData([]);

    fetchData(false);
  }, [nameClass, debouncedSearch]);

  // ===== LOAD MORE =====
  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || isSearching || data.length >= total) {
      return;
    }

    setIsLoadingMore(true);
    fetchData(true);
  };

  const handlePress = (item: Record<string, any>) => {
    navigation.navigate("AssetRelatedDetails", {
      id: String(item.id),
      field: JSON.stringify(fieldActive),
      nameClass,
    });
  };

  if (isLoading && !isSearching && !isLoadingMore) {
    return <IsLoading />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm..."
          placeholderTextColor="#999"
          value={searchText}
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
        contentContainerStyle={{ paddingBottom: 0 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
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
