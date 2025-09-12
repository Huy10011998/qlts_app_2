import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { useParams } from "../../hooks/useParams";
import { Conditions } from "../../types";
import { SqlOperator, TypeProperty } from "../../utils/enum";
import { getListAttachFile } from "../../services";
import IsLoading from "../ui/IconLoading";
import ListCardAttachFile from "../list/ListCardAttachFile";

export default function AssetListAttachFile() {
  const [file, setFile] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);

  const { id, nameClass: paramNameClass } = useParams();
  const nameClass = paramNameClass;
  const pageSize = 20;

  const conditions = useMemo<Conditions[]>(
    () => [
      {
        property: "ID_Class",
        operator: SqlOperator.Equals,
        value: String(id ?? ""),
        type: TypeProperty.Int,
      },
      {
        property: "Name_Class",
        operator: SqlOperator.Equals,
        value: String(nameClass ?? ""),
        type: TypeProperty.String,
      },
    ],
    [id, nameClass]
  );

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass) return;

      if (isLoadMore) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const currentSkip = isLoadMore ? skipSize : 0;
        const response = await getListAttachFile(
          nameClass,
          "",
          pageSize,
          currentSkip,
          "",
          conditions,
          []
        );
        const newItems: Record<string, any>[] = response?.data?.items || [];
        const totalItems = response?.data?.totalCount || 0;

        if (isLoadMore) {
          setFile((prev) => [...prev, ...newItems]);
          setSkipSize(currentSkip + pageSize);
        } else {
          setFile(newItems);
          setSkipSize(pageSize);
        }

        setTotal(totalItems);
      } catch (error) {
        if (__DEV__) console.error("API error:", error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu.");
        if (!isLoadMore) setFile([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [nameClass, skipSize, conditions]
  );

  useEffect(() => {
    if (!nameClass) return;
    fetchData();
  }, [nameClass]);

  const handleLoadMore = () => {
    if (file.length < total && !isLoadingMore) fetchData(true);
  };

  if (isLoading) return <IsLoading />;

  return (
    <View style={styles.container}>
      <FlatList
        data={file}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ListCardAttachFile item={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListHeaderComponent={
          <View style={styles.stickyHeader}>
            <Text style={styles.header}>
              Tổng số tệp: {total} (Đã tải: {file.length})
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
});
