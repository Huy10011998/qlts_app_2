import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import IsLoading from "../../components/ui/IconLoading";
import { DetailsHistoryProps, Field, StackRoute } from "../../types/Index";
import { getDetailsHistory } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAutoReload } from "../../hooks/useAutoReload";

export default function AssetHistoryDetail({ children }: DetailsHistoryProps) {
  const route = useRoute<StackRoute<"AssetHistoryDetail">>();
  const { id, id_previous, nameClass, field } = route.params;

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [previousItem, setPreviousItem] = useState<any>(null);

  // parse fields safely
  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);

  // grouped by groupLayout
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  const handleChangeTab = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const fetchDetails = async () => {
    // 👉 RESET để UI render "--"
    setItem(null);
    setPreviousItem(null);
    setIsLoading(true);

    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");

      // bản ghi hiện tại
      const response = await getDetailsHistory(nameClass, id);
      setItem(response.data);

      // bản ghi trước đó
      if (id_previous) {
        const prevResponse = await getDetailsHistory(nameClass, id_previous);
        setPreviousItem(prevResponse.data);
      }
    } catch (e) {
      error(e);
      Alert.alert("Lỗi", `Không thể tải chi tiết lịch sử ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab("list");
    fetchDetails();
  }, [id, id_previous, nameClass]);

  useAutoReload(fetchDetails);

  // so sánh field
  const isFieldChanged = (
    field: Field,
    currentItem: any,
    previousItem: any
  ): boolean => {
    if (!previousItem) return false;

    const currentValue = getFieldValue(currentItem, field);
    const prevValue = getFieldValue(previousItem, field);

    return String(currentValue ?? "") !== String(prevValue ?? "");
  };

  return (
    <View style={styles.container}>
      {/* Loading dạng overlay – KHÔNG che UI */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <IsLoading size="small" color="#FF3333" />
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
