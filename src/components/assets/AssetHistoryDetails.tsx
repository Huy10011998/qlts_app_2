import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { getFieldValue } from "../../utils/Helper";
import IsLoading from "../../components/ui/IconLoading";
import {
  DetailsHistoryProps,
  DetailsHistoryRouteProp,
  Field,
} from "../../types/Index";
import { getDetailsHistory } from "../../services/data/CallApi";

export default function AssetHistoryDetail({ children }: DetailsHistoryProps) {
  const route = useRoute<DetailsHistoryRouteProp>();
  const { id, id_previous, nameClass, field } = route.params;

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [previousItem, setPreviousItem] = useState<any>(null);

  // parse fieldActive
  const fieldActive: Field[] = useMemo(() => {
    try {
      return field ? JSON.parse(field as string) : [];
    } catch {
      return [];
    }
  }, [field]);

  // group theo groupLayout
  const groupedFields = useMemo(() => {
    var result = fieldActive.reduce<Record<string, Field[]>>(
      (groups, field) => {
        const groupName = field.groupLayout || "Thông tin chung";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(field);
        return groups;
      },
      {}
    );
    return result;
  }, [fieldActive]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleChangeTab = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  useEffect(() => {
    const fetchDetails = async () => {
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
        } else {
          setPreviousItem(null);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", `Không thể tải chi tiết lịch sử ${nameClass}`);
      } finally {
        setIsLoading(false);
      }
    };

    setActiveTab("list");
    fetchDetails();
  }, [id, id_previous, nameClass]);

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

  if (isLoading) {
    return <IsLoading size="large" color="#FF3333" />;
  }

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: "#F9F9F9" },
});
