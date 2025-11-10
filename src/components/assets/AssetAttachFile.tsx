import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { useParams } from "../../hooks/useParams";
import { Conditions, FileItem } from "../../types";
import { SqlOperator, TypeProperty, CategoryFiles } from "../../utils/Enum";
import { getListAttachFile } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import ListCardAttachFile from "../list/ListCardAttachFile";

export default function AssetListAttachFile() {
  const [file, setFile] = useState<FileItem[]>([]);
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
        const newItems: FileItem[] = response?.data?.items || [];
        const totalItems: number = response?.data?.totalCount || 0;

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

  const groupedData = useMemo<Record<string, FileItem[]>>(() => {
    return file.reduce((acc, item) => {
      const key = item.categoryFile ?? "Khac"; // fallback nếu undefined
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, FileItem[]>);
  }, [file]);

  const categories = Object.keys(groupedData);

  if (isLoading) return <IsLoading size="large" color="#FF3333" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(cat) => cat}
        renderItem={({ item: category }) => {
          const categoryLabel =
            (CategoryFiles as any as Record<string, { label: string }>)[
              category
            ]?.label || "Khác";

          return (
            <View style={styles.groupContainer}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>

              {groupedData[category].map((fileItem) => (
                <ListCardAttachFile key={fileItem.id} item={fileItem} />
              ))}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 70 }}
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
  groupContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    paddingBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
});
