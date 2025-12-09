import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  ActivityIndicator,
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

  if (!nameClass && idRoot && propertyReference) {
    Alert.alert(
      "Lỗi",
      "Thiếu nameClass hoặc idRoot hoặc propertyReference trong params"
    );
    return null;
  }

  // Điều kiện filter liên kết
  const conditions = useMemo(() => {
    return propertyReference && idRoot
      ? [
          {
            property: propertyReference,
            operator: SqlOperator.Equals,
            value: String(idRoot),
            type: TypeProperty.Int,
          },
        ]
      : [];
  }, [propertyReference, idRoot]);

  const handlePress = async (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetRelatedDetails", {
        id: String(item.id),
        field: JSON.stringify(fieldActive),
        nameClass: nameClass || "",
      });
    } catch (e) {
      error(e);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const [linhkien, setLinhkien] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(true); // load lần đầu
  const [isLoadingMore, setIsLoadingMore] = useState(false); // load thêm
  const [isSearching, setIsSearching] = useState(false); // loading khi search
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 600); // debounce 600ms
  const pageSize = 20;

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass) return;

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else if (debouncedSearch) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      try {
        if (!isLoadMore && fieldActive.length === 0) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile)
          );
        }

        if (!isLoadMore && !propertyClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          setPropertyClass(responsePropertyClass?.data);
        }

        const currentSkip = isLoadMore ? skipSize : 0;

        const response = await getList(
          nameClass,
          "",
          pageSize,
          currentSkip,
          debouncedSearch,
          conditions,
          []
        );

        const newItems: Record<string, any>[] = response?.data?.items || [];
        const totalItems = response?.data?.totalCount || 0;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isLoadMore) {
          setLinhkien((prev) => [...prev, ...newItems]);
          setSkipSize(currentSkip + pageSize);
        } else {
          setLinhkien(newItems);
          setSkipSize(pageSize);
        }

        setTotal(totalItems);
      } catch (e) {
        error("API error:", e);
        Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        if (!isLoadMore) setLinhkien([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsSearching(false);
      }
    },
    [nameClass, propertyClass, skipSize, debouncedSearch]
  );

  // fetch data khi nameClass hoặc debouncedSearch thay đổi
  useEffect(() => {
    if (!nameClass) return;
    fetchData(false);
  }, [nameClass, debouncedSearch]);

  const handleLoadMore = () => {
    if (linhkien.length < total && !isLoadingMore) {
      fetchData(true);
    }
  };

  if (isLoading && !isSearching) return <IsLoading />;

  return (
    <View style={{ flex: 1 }}>
      {/* Search Box */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color="#FF3333"
            style={styles.searchLoader}
          />
        )}
      </View>

      {/* List */}
      <FlatList
        data={linhkien}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListCardAsset
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              Tổng số: {total} (Đã tải: {linhkien.length})
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
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#333",
  },

  searchLoader: {
    marginLeft: 8,
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
