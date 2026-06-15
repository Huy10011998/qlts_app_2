import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import type { DetailsProps } from "../../types/index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services";
import IsLoading from "../ui/IconLoading";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { TAB_ITEMS } from "../../utils/Helper";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useAppDispatch } from "../../store/hooks";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { BG, BRAND_RED } from "./shared/listTheme";
import { isNetworkRequestError } from "../../utils/helpers/api";

export default function AssetDetails({ children }: DetailsProps) {
  const { id, nameClass, field, activeTab: tabFromParams } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const {
    activeTab,
    collapsedGroups,
    fieldActive,
    groupedFields,
    handleChangeTab,
    toggleGroup,
  } = useDetailViewState(field, tabFromParams ?? "list");

  const dispatch = useAppDispatch();
  const { isMounted } = useSafeAlert();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");
      const response = await getDetails(nameClass, id);
      setItem(response.data);
      setLoadErrorMessage(null);
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);
      setLoadErrorMessage(
        "Không tải được dữ liệu chi tiết. Vui lòng kiểm tra kết nối mạng rồi thử lại.",
      );
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id, isMounted, nameClass]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshDetails) {
        fetchDetails();
        dispatch(resetShouldRefreshDetails());
      }
    }, [dispatch, fetchDetails, shouldRefreshDetails]),
  );

  useNetworkAwareReload(fetchDetails, {
    hasError: Boolean(loadErrorMessage),
    refetchOnAppResume: true,
    onOffline: () => {
      setLoadErrorMessage(
        "Không tải được dữ liệu chi tiết. Vui lòng kiểm tra kết nối mạng rồi thử lại.",
      );
    },
  });

  useEffect(() => {
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [id, nameClass, fetchDetails]);

  if (isLoading && !item && !loadErrorMessage)
    return <IsLoading size="large" color={BRAND_RED} />;

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
        loadErrorMessage,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
});
