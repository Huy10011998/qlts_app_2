import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { DetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { getFieldValue, TAB_ITEMS } from "../../utils/Helper";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";
import { AppDispatch, RootState } from "../../store";
import { useDispatch, useSelector } from "react-redux";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { error } from "../../utils/Logger";

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

  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails
  );

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
    } catch (e) {
      error(e);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      setIsLoading(false);
    }
  }, [id, nameClass]);

  useEffect(() => {
    if (shouldRefreshDetails) {
      fetchDetails();
      dispatch(resetShouldRefreshDetails()); // reset lại
    }
  }, [shouldRefreshDetails]);

  // fetch lần đầu khi mount
  useEffect(() => {
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [id, nameClass, fetchDetails]);

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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingBottom: 20 },
});
