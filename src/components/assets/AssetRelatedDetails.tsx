import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { error } from "../../utils/Logger";
import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { TAB_ITEMS } from "../../utils/Helper";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch } from "../../store/Hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";

export default function AssetRelatedDetails({ children }: DetailsProps) {
  const { id, nameClass, field } = useParams();

  const [activeTab, setActiveTab] = useState("list");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  // Redux
  const dispatch = useAppDispatch();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );

  // Parse field từ params

  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);

  // Gom các field theo groupLayout
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  // Toggle group collapsed/expanded
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  const handleChangeTab = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");

      const response = await getDetails(nameClass, id);
      setItem(response.data);
    } catch (e) {
      error(e);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshDetails) {
        fetchDetails();
        dispatch(resetShouldRefreshDetails());
      }
    }, [shouldRefreshDetails, fetchDetails]),
  );

  useEffect(() => {
    setActiveTab("list");
    fetchDetails();
  }, [id, nameClass]);

  useAutoReload(fetchDetails);
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
        fieldActive: fieldActive || [],
        nameClass: nameClass || "",
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
});
