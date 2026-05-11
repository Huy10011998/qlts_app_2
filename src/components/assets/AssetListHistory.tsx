import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
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
  const [lichsu, setLichsu] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [skipSize, setSkipSize] = useState(0);
  const [total, setTotal] = useState(0);

  const { id, nameClass: paramNameClass } = useParams();
  const nameClass = paramNameClass;
  const pageSize = 20;

  const navigation = useNavigation<StackNavigation<"AssetListHistory">>();
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  };

  const fetchData = useCallback(
    async (isLoadMore = false, options?: { isRefresh?: boolean }) => {
      if (!nameClass || !id) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        !isLoadMore && (isRefresh || fieldActive.length === 0);
      const shouldReloadPropertyClass =
        !isLoadMore && (isRefresh || !propertyClass);

      if (isLoadMore) setIsLoadingMore(true);
      else if (!isRefresh) setIsLoading(true);

      try {
        if (shouldReloadFieldConfig) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile),
          );
        }

        if (shouldReloadPropertyClass) {
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
      } catch (e) {
        error(e);
        if (!isAuthExpiredError(e)) {
          showAlertIfActive("Lỗi", "Không thể tải dữ liệu.");
        }
        if (!isLoadMore) setLichsu([]);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsRefreshingTop(false);
        }
      }
    },
    [nameClass, fieldActive.length, propertyClass, skipSize, id],
  );

  useEffect(() => {
    if (!nameClass || !id) return;
    fetchData();
  }, [nameClass, id, fetchData]);

  useAutoReload(fetchData);

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);
    setSkipSize(0);

    await fetchData(false, { isRefresh: true });
  };

  const handleLoadMore = () => {
    if (lichsu.length < total && !isLoadingMore) fetchData(true);
  };

  if (isLoading && !isRefreshingTop) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }

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
        contentContainerStyle={{ paddingBottom: 20 }}
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
            fullHeight
            iconName="time-outline"
            title="Chưa có lịch sử"
            subtitle="Dữ liệu thay đổi sẽ được hiển thị tại đây khi có phát sinh."
          />
        }
        ListHeaderComponent={
          <AssetListSummaryCard
            iconName="time-outline"
            title="Lịch sử thay đổi"
            subtitle={`Tổng số lịch sử: ${total} • Đã tải: ${lichsu.length}`}
          />
        }
        stickyHeaderIndices={[0]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ...sharedAssetListStyles,
  container: { flex: 1, backgroundColor: BG },
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
