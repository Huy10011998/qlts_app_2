import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import IsLoading from "../../components/ui/IconLoading";
import { DetailsHistoryProps, Field, StackRoute } from "../../types/Index";
import { getDetailsHistory } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { C } from "../../utils/helpers/colors";

export default function AssetHistoryDetail({ children }: DetailsHistoryProps) {
  const route = useRoute<StackRoute<"AssetHistoryDetail">>();
  const { id, id_previous, nameClass, field } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [previousItem, setPreviousItem] = useState<any>(null);
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết lịch sử ${nameClass}`);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id, id_previous, isMounted, nameClass, showAlertIfActive]);

  useEffect(() => {
    setActiveTab("list");
    fetchDetails();
  }, [fetchDetails, setActiveTab]);

  useAutoReload(fetchDetails);

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

      {children({
        activeTab,
        setActiveTab: handleChangeTab,
        groupedFields,
        collapsedGroups,
        toggleGroup,
        item,
        previousItem,
        getFieldValue,
        isFieldChanged,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  loadingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
});
