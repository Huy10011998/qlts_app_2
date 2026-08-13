import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import type { QrDetailsProps } from "../../types/index";
import { useParams } from "../../hooks/useParams";
import { getDetails } from "../../services";
import IsLoading from "../ui/IconLoading";
import EmptyState from "../ui/EmptyState";
import { error } from "../../utils/Logger";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { useAppDispatch } from "../../store/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { resetShouldRefreshDetails } from "../../store/AssetSlice";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useDetailViewState } from "../../hooks/useDetailViewState";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export default function QrDetails({ children }: QrDetailsProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { id, nameClass, field, itemData } = useParams();
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
  } = useDetailViewState(field);

  const dispatch = useAppDispatch();
  const shouldRefreshDetails = useSelector(
    (state: RootState) => state.asset.shouldRefreshDetails,
  );
  const { isMounted } = useSafeAlert();

  const fetchDetails = useCallback(async () => {
    if (!id || !nameClass) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getDetails(nameClass, id);
      setItem(response.data);
      setLoadErrorMessage(null);
    } catch (e) {
      error(e);
      setItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    } finally {
      if (isMounted()) setIsLoading(false);
    }
  }, [id, isMounted, nameClass]);

  useEffect(() => {
    if (!itemData) return;

    setItem(itemData);
    setLoadErrorMessage(null);
    setIsLoading(false);
  }, [itemData]);

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
    onOffline: () => {
      setItem(null);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại.",
      );
    },
  });

  useEffect(() => {
    if (itemData) return;
    if (id && nameClass) fetchDetails();
    else setIsLoading(false);
  }, [fetchDetails, id, itemData, nameClass]);

  if (isLoading) return <IsLoading size="large" color={c.red} />;

  if (loadErrorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateRoot}>
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không thể tải chi tiết QR"
            subtitle={loadErrorMessage}
          />
        </View>
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
        nameClass: nameClass || "",
        fieldActive: fieldActive || [],
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
    },
    emptyStateRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
  });
