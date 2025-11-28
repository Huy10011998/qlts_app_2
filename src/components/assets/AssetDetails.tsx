import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { getFieldValue, TAB_ITEMS } from "../../utils/Helper";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";

export default function AssetDetails({ children }: DetailsProps) {
  const { id, nameClass, field, activeTab: tabFromParams } = useParams();

  const [activeTab, setActiveTab] = useState(tabFromParams ?? "list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  const fieldActive = useMemo(() => parseFieldActive(field), [field]);
  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleChangeTab = (tabKey: string) => setActiveTab(tabKey);

  const fetchDetails = useCallback(async () => {
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
  }, [id, nameClass]);

  // fetch lần đầu khi mount
  useEffect(() => {
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [id, nameClass, fetchDetails]);

  // Hàm onReload sẽ được truyền xuống children
  const handleReload = () => {
    fetchDetails();
  };

  if (isLoading) return <IsLoading size="large" color="#FF3333" />;

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
        nameClass: nameClass || "",
        fieldActive: fieldActive || [],
        onReload: handleReload,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingBottom: 20 },
});
