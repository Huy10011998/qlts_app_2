import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import {
  DetaiHistoryNavigationProp,
  Field,
  ListContainerProps,
  PropertyResponse,
} from "../../types";
import { useParams } from "../../hooks/useParams";
import {
  getFieldActive,
  getPropertyClass,
  getListHistory,
} from "../../services/Index";
import ListCardHistory from "../list/ListCardHistory";
import IsLoading from "../ui/IconLoading";
import orderBy from "lodash/orderBy";
import { useNavigation } from "@react-navigation/native";

export default function AssetListHistory() {
  const [lichsu, setLichsu] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);

  const { id, nameClass: paramNameClass } = useParams();
  const nameClass = paramNameClass;
  const pageSize = 20;

  const navigation = useNavigation<DetaiHistoryNavigationProp>();

  const handlePress = async (item: Record<string, any>, index: number) => {
    const currentIndex = lichsu.findIndex((x) => x.id === item.id);
    const id_previous =
      currentIndex < lichsu.length - 1 ? lichsu[currentIndex + 1].id : null;

    try {
      navigation.navigate("AssetHistoryDetail", {
        id: item.id,
        id_previous: id_previous,
        field: JSON.stringify(fieldActive),
        nameClass: nameClass!,
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass || !id) return;

      if (isLoadMore) setIsLoadingMore(true);
      else setIsLoading(true);

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

        const response = await getListHistory(id, nameClass);
        let newItems: Record<string, any>[] = response?.data || [];
        newItems = orderBy(newItems, ["log_StartDate"], ["desc"]);
        const totalItems = newItems.length;

        if (isLoadMore) {
          setLichsu((prev) => [...prev, ...newItems]);
          setSkipSize(skipSize + pageSize);
        } else {
          setLichsu(newItems);
          setSkipSize(pageSize);
        }
        setTotal(totalItems);
      } catch (error) {
        if (__DEV__) console.error(error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        if (!isLoadMore) setLichsu([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [nameClass, fieldActive.length, propertyClass, skipSize, id]
  );

  useEffect(() => {
    if (!nameClass || !id) return;
    fetchData();
  }, [nameClass, id, fetchData]);

  const handleLoadMore = () => {
    if (lichsu.length < total && !isLoadingMore) fetchData(true);
  };

  if (isLoading) return <IsLoading size="large" color="#FF3333" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={lichsu}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <ListCardHistory
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item, index)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              Tổng số lịch sử: {total} (Đã tải: {lichsu.length})
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    textAlign: "center",
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  stickyHeader: { backgroundColor: "#F3F4F6", paddingVertical: 10, zIndex: 10 },
  searchBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    margin: 12,
    backgroundColor: "#fff",
  },
});
