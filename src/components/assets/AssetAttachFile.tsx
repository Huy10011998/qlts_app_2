import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useParams } from "../../hooks/useParams";
import { Conditions, FileItem } from "../../types";
import { SqlOperator, TypeProperty, CategoryFiles } from "../../utils/Enum";
import { getListAttachFile } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import ListCardAttachFile from "../list/ListCardAttachFile";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/CallApi";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import AssetListSummaryCard from "./shared/AssetListSummaryCard";
import { sharedAssetListStyles } from "./shared/listStyles";
import { BG, BRAND_RED, CARD_SHADOW } from "./shared/listTheme";

export default function AssetListAttachFile() {
  const [file, setFile] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const skipSizeRef = useRef(0);

  const { id, nameClass: paramNameClass } = useParams();
  const nameClass = paramNameClass;
  const pageSize = 20;
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
    [id, nameClass],
  );

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!nameClass) return;

      if (isLoadMore) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const currentSkip = isLoadMore ? skipSizeRef.current : 0;
        const response = await getListAttachFile(
          nameClass,
          "",
          pageSize,
          currentSkip,
          "",
          conditions,
          [],
        );
        const newItems: FileItem[] = response?.data?.items || [];
        const totalItems: number = response?.data?.totalCount || 0;

        if (isLoadMore) {
          setFile((prev) => [...prev, ...newItems]);
          const nextSkipSize = currentSkip + pageSize;
          skipSizeRef.current = nextSkipSize;
        } else {
          setFile(newItems);
          skipSizeRef.current = pageSize;
        }

        setTotal(totalItems);
      } catch (e) {
        error("API error:", e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu.");
        }
        if (!isLoadMore) setFile([]);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [conditions, isMounted, nameClass, showAlertIfActive],
  );

  useEffect(() => {
    if (!nameClass) return;
    fetchData();
  }, [fetchData, nameClass]);

  useAutoReload(fetchData);

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

  if (isLoading) return <IsLoading size="large" color={BRAND_RED} />;

  const isEmpty = categories.length === 0;

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
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="document-outline"
            title="Chưa có tệp đính kèm"
            subtitle="Danh sách tệp sẽ hiển thị tại đây khi có dữ liệu."
          />
        }
        ListHeaderComponent={
          isEmpty ? null : (
            <AssetListSummaryCard
              iconName="attach-outline"
              title="Danh sách tệp"
              subtitle={`${total} tệp • hiển thị ${file.length}`}
            />
          )
        }
        stickyHeaderIndices={isEmpty ? [] : [0]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ...sharedAssetListStyles,
  container: { ...sharedAssetListStyles.container, backgroundColor: BG },
  listContent: {
    ...sharedAssetListStyles.listContent,
    paddingTop: 14,
    paddingBottom: 20,
  },
  listContentEmpty: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  groupContainer: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    ...CARD_SHADOW,
    paddingBottom: 8,
  },

  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E31E24",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
});
