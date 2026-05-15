import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Field, PropertyResponse, StackNavigation } from "../../types";
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
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isAuthExpiredError } from "../../services/data/CallApi";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import AssetListSummaryCard from "./shared/AssetListSummaryCard";
import { sharedAssetListStyles } from "./shared/listStyles";
import { BG, BRAND_RED } from "./shared/listTheme";

export default function AssetListHistory() {
  const [historyItems, setHistoryItems] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [total, setTotal] = useState(0);
  const fieldActiveRef = useRef<Field[]>([]);
  const propertyClassRef = useRef<PropertyResponse | undefined>(undefined);
  const skipSizeRef = useRef(0);

  const { id, nameClass } = useParams();
  const pageSize = 20;

  const navigation = useNavigation<StackNavigation<"AssetListHistory">>();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handlePress = useCallback(
    async (item: Record<string, any>) => {
      const currentIndex = historyItems.findIndex((x) => x.id === item.id);
      const previousId =
        currentIndex < historyItems.length - 1
          ? historyItems[currentIndex + 1].id
          : null;

      try {
        navigation.navigate("AssetHistoryDetail", {
          id: item.id,
          id_previous: previousId,
          field: JSON.stringify(fieldActive),
          nameClass: nameClass!,
        });
      } catch (e) {
        error(e);
        showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    },
    [
      fieldActive,
      historyItems,
      isMounted,
      nameClass,
      navigation,
      showAlertIfActive,
    ],
  );

  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (!nameClass || !id) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActiveRef.current.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClassRef.current);

      if (isLoadMore) setIsLoadingMore(true);
      else if (!isRefresh) setIsLoading(true);

      try {
        if (shouldReloadFieldConfig) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          fieldActiveRef.current = activeFields;
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile),
          );
        }

        if (shouldReloadPropertyClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          const nextPropertyClass = responsePropertyClass?.data;
          propertyClassRef.current = nextPropertyClass;
          setPropertyClass(nextPropertyClass);
        }

        const response = await getListHistory(id, nameClass);
        let newItems: Record<string, any>[] = response?.data || [];
        newItems = orderBy(newItems, ["log_StartDate"], ["desc"]);
        const totalItems = newItems.length;

        if (isLoadMore) {
          setHistoryItems((prev) => [...prev, ...newItems]);
          const nextSkipSize = skipSizeRef.current + pageSize;
          skipSizeRef.current = nextSkipSize;
        } else {
          setHistoryItems(newItems);
          skipSizeRef.current = pageSize;
        }
        setTotal(totalItems);
      } catch (e) {
        error(e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu.");
        }
        if (!isLoadMore) setHistoryItems([]);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsRefreshingTop(false);
        }
      }
    },
    [id, isMounted, nameClass, showAlertIfActive],
  );

  useEffect(() => {
    if (!nameClass || !id) return;
    fetchData();
  }, [nameClass, id, fetchData]);

  useAutoReload(fetchData);

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    skipSizeRef.current = 0;

    await fetchData(false, { isRefresh: true });
  };

  const handleLoadMore = () => {
    if (historyItems.length < total && !isLoadingMore) fetchData(true);
  };

  if (isLoading && !isRefreshingTop) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }

  const isEmpty = historyItems.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={historyItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ListCardHistory
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={[BRAND_RED]}
            tintColor={BRAND_RED}
            progressViewOffset={50}
          />
        }
        scrollEventThrottle={16}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <IsLoading /> : null}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="time-outline"
            title="Chưa có lịch sử"
            subtitle="Dữ liệu thay đổi sẽ được hiển thị tại đây khi có phát sinh."
          />
        }
        ListHeaderComponent={
          isEmpty ? null : (
            <AssetListSummaryCard
              iconName="time-outline"
              title="Lịch sử thay đổi"
              subtitle={`Tổng số lịch sử: ${total} • Đã tải: ${historyItems.length}`}
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
  container: { flex: 1, backgroundColor: BG },
  listContent: {
    flexGrow: 1,
    paddingTop: 14,
    paddingBottom: 20,
  },
  listContentEmpty: {
    paddingTop: 0,
    paddingBottom: 0,
  },
});
