import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { DetailsProps, Field } from "../../types";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services";
import IsLoading from "../ui/IconLoading";
import { getFieldValue } from "../../utils/helper";

// Các tab mặc định
export const TAB_ITEMS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "details", label: "Chi tiết", icon: "menu-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "history", label: "Lịch sử", icon: "time-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

export default function AssetDetails({ children }: DetailsProps) {
  const { id, nameClass, field } = useParams();

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  // Parse field từ params
  const fieldActive: Field[] = useMemo(() => {
    try {
      return field ? JSON.parse(field as string) : [];
    } catch {
      return [];
    }
  }, [field]);

  // Gom các field theo groupLayout
  const groupedFields = useMemo(() => {
    return fieldActive.reduce<Record<string, Field[]>>((groups, field) => {
      const groupName = field.groupLayout || "Thông tin chung";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field);
      return groups;
    }, {});
  }, [fieldActive]);

  // Toggle group collapsed/expanded
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

        const response = await getDetails(nameClass, id);
        setItem(response.data);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        setIsLoading(false);
      }
    };

    setActiveTab("list");
    fetchDetails();
  }, [id, nameClass]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <IsLoading />
      </View>
    );
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
        getFieldValue,
        TAB_ITEMS,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingBottom: 20 },
});
