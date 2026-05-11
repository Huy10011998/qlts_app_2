import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { DetailsProps } from "../../types/Index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services/Index";
import IsLoading from "../ui/IconLoading";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { TAB_ITEMS } from "../../utils/Helper";
import { useAutoReload } from "../../hooks/useAutoReload";
import { useAppDispatch } from "../../store/Hooks";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";

const BG = "#F0F2F8";
const BRAND_RED = "#E31E24";

export default function AssetDetails({ children }: DetailsProps) {
  const { id, nameClass, field, activeTab: tabFromParams } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  const {
    activeTab,
    collapsedGroups,
    fieldActive,
    groupedFields,
    handleChangeTab,
    toggleGroup,
  } = useDetailViewState(field, tabFromParams ?? "list");

  // Redux
  const dispatch = useAppDispatch();
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");
      const response = await getDetails(nameClass, id);
      setItem(response.data);
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id, nameClass]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshDetails) {
        fetchDetails();
        dispatch(resetShouldRefreshDetails());
      }
    }, [shouldRefreshDetails, fetchDetails]),
  );

  useAutoReload(fetchDetails);

  // fetch lần đầu khi mount
  useEffect(() => {
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [id, nameClass, fetchDetails]);

  if (isLoading) return <IsLoading size="large" color={BRAND_RED} />;

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
  container: { flex: 1, backgroundColor: BG },
});
