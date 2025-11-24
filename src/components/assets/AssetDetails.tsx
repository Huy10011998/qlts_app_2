import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { getFieldValue, TAB_ITEMS } from "../../utils/Helper";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";

export default function AssetDetails({ children }: DetailsProps) {
  const { id, nameClass, field } = useParams();

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  // parse fields safely
  const fieldActive = useMemo(() => parseFieldActive(field), [field]);

  // grouped by groupLayout (kept as-is style D)
  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

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
        getFieldValue,
        TAB_ITEMS,
        nameClass: nameClass || "",
        fieldActive: fieldActive || [],
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingBottom: 20 },
});
