import React, { useCallback, useEffect, useState } from "react";
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
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import {
  RootStackParamList,
  Field,
  PropertyResponse,
  AssetDetailsNavigationProp,
} from "../../types";
import { getFieldActive, getList, getPropertyClass } from "../../services";
import ListCardAsset from "../../components/list/ListCardAsset";
import IsLoading from "../../components/ui/IconLoading";
import { normalizeText } from "../../utils/helper";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Route type
type AssetListScreenRouteProp = RouteProp<RootStackParamList, "AssetList">;

export default function AssetList() {
  const route = useRoute<AssetListScreenRouteProp>();
  const navigation = useNavigation<AssetDetailsNavigationProp>();

  const { nameClass: paramNameClass, titleHeader } = route.params || {};
  const nameClass = paramNameClass;

  const [taisan, setTaiSan] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const pageSize = 20;

  // Fetch data function
  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass) return;

      if (isLoadMore) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        // Lấy fieldActive và fieldShowMobile lần đầu
        if (!isLoadMore && fieldActive.length === 0) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile)
          );
        }

        // Lấy propertyClass lần đầu
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
          searchText,
          fieldActive,
          [],
          []
        );

        const newItems: Record<string, any>[] = response?.data?.items || [];
        const totalItems = response?.data?.totalCount || 0;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (isLoadMore) {
          setTaiSan((prev) => [...prev, ...newItems]);
          setSkipSize(currentSkip + pageSize);
        } else {
          setTaiSan(newItems);
          setSkipSize(pageSize);
        }

        setTotal(totalItems);
      } catch (error) {
        console.error("API error:", error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        if (!isLoadMore) setTaiSan([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [nameClass, fieldActive, propertyClass, skipSize, searchText]
  );

  // Debounce search + initial fetch
  useEffect(() => {
    if (!nameClass) return;

    const timeout = setTimeout(() => {
      fetchData(false);
    }, 500); // debounce 500ms

    return () => clearTimeout(timeout);
  }, [nameClass, searchText]);

  // Load more
  const handleLoadMore = () => {
    if (taisan.length < total && !isLoadingMore) {
      fetchData(true);
    }
  };

  const handlePress = async (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetDetails", {
        id: String(item.id),
        field: JSON.stringify(fieldActive),
        nameClass: nameClass,
        titleHeader: titleHeader,
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <IsLoading />;

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder="Tìm kiếm..."
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={(text) => setSearchText(normalizeText(text))}
        style={styles.searchInput}
      />
      <FlatList
        data={taisan}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListCardAsset
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }} // tránh FAB che
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              Tổng số tài sản: {total} (Đã tải: {taisan.length})
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    margin: 12,
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
