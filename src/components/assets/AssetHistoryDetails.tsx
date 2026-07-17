import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import IsLoading from "../../components/ui/IconLoading";
import type { DetailsHistoryProps, Field, StackRoute } from "../../types/index";
import { getDetailsHistory } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { C } from "../../utils/helpers/colors";
import EmptyState from "../ui/EmptyState";

export default function AssetHistoryDetail({ children }: DetailsHistoryProps) {
  const route = useRoute<StackRoute<"AssetHistoryDetail">>();
  const { id, id_previous, nameClass, field } = route.params;

  const [isLoading, setIsLoading] = useState(false);
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

      const response = await getDetailsHistory(nameClass, id);
      setItem(response.data);

      if (id_previous) {
        const prevResponse = await getDetailsHistory(nameClass, id_previous);
        setPreviousItem(prevResponse.data);
      }
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

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <IsLoading size="small" color={C.red} />
        </View>
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
  },
  loadingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  emptyStateRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
});
