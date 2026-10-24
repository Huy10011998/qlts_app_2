import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { DetailsHistoryProps, Field, StackRoute } from "../../types/index";
import { getDetailsHistory } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import EmptyState from "../ui/EmptyState";
import AssetDetailsSkeleton from "./shared/AssetDetailsSkeleton";

export default function AssetHistoryDetail({ children }: DetailsHistoryProps) {
  const styles = useStyles(makeStyles);
  const route = useRoute<StackRoute<"AssetHistoryDetail">>();
  const { id, id_previous, nameClass, field } = route.params;

  // true ngay từ đầu: effect gọi tải ở frame sau, đừng để frame đầu vẽ field trống.
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [previousItem, setPreviousItem] = useState<any>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const { isMounted } = useSafeAlert();

  const {
    activeTab,
    collapsedGroups,
    groupedFields,
    handleChangeTab,
    setActiveTab,
    toggleGroup,
  } = useDetailViewState(field as string | undefined);

  const fetchDetails = useCallback(async () => {
    setItem(null);
    setPreviousItem(null);
    setIsLoading(true);

    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");

      // Hai bản cùng lúc và cùng hiện: hiện bản này trước thì mọi dòng là chữ
      // thường, bản trước về mới tô đỏ "cũ -> mới" và trang nhảy.
      const [response, prevResponse] = await Promise.all([
        getDetailsHistory(nameClass, id),
        id_previous ? getDetailsHistory(nameClass, id_previous) : null,
      ]);
      setItem(response.data);
      setPreviousItem(prevResponse?.data ?? null);
      setLoadErrorMessage(null);
    } catch (e) {
      error(e);
      setItem(null);
      setPreviousItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id, id_previous, isMounted, nameClass]);

  useEffect(() => {
    setActiveTab("list");
    fetchDetails();
  }, [fetchDetails, setActiveTab]);

  useNetworkAwareReload(fetchDetails, {
    hasError: Boolean(loadErrorMessage),
    refetchOnAppResume: true,
    onOffline: () => {
      setItem(null);
      setPreviousItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    },
  });

  // so sánh field
  const isFieldChanged = (
    compareField: Field,
    currentItem: any,
    previousHistoryItem: any,
  ): boolean => {
    if (!previousHistoryItem) return false;

    const currentValue = getFieldValue(currentItem, compareField);
    const prevValue = getFieldValue(previousHistoryItem, compareField);

    return String(currentValue ?? "") !== String(prevValue ?? "");
  };

  // Như `AssetDetails`: nhãn field đã có sẵn từ route, chỉ giá trị phải chờ.
  if (isLoading && !item && !loadErrorMessage) {
    return <AssetDetailsSkeleton groupedFields={groupedFields} />;
  }

  return (
    <View style={styles.container}>
      {loadErrorMessage ? (
        <View style={styles.emptyStateRoot}>
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải chi tiết lịch sử"
            subtitle={loadErrorMessage}
          />
        </View>
      ) : (
        children({
          activeTab,
          setActiveTab: handleChangeTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          previousItem,
          getFieldValue,
          isFieldChanged,
        })
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
    },
    emptyStateRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
  });
