import { AppColors, useStyles } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import type { Field, PropertyResponse, StackNavigation } from "../../types";
import { useParams } from "../../hooks/useParams";
import {
  getFieldActive,
  getPropertyClass,
  getListHistory,
} from "../../services";
import RecordListSkeleton from "../list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../ui/shouldShowListSkeleton";
import ListCardHistory from "../list/ListCardHistory";
import orderBy from "lodash/orderBy";
import { useNavigation } from "@react-navigation/native";
import { error } from "../../utils/Logger";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { isNetworkRequestError } from "../../utils/helpers/api";
import AssetListEmptyState from "./shared/AssetListEmptyState";
import { makeSharedAssetListStyles } from "./shared/listStyles";
import { BRAND_RED } from "./shared/listTheme";

const LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối mạng rồi bấm Thử lại.";

export default function AssetListHistory({
  rootRecordLabel,
}: {
  /** Mã bản ghi đang xem, chuyển tiếp cho header màn chi tiết lịch sử. */
  rootRecordLabel?: string;
} = {}) {
  const styles = useStyles(makeStyles);
  const [historyItems, setHistoryItems] = useState<Record<string, any>[]>([]);
  const [fieldActive, setFieldActive] = useState<Field[]>([]);
  const [fieldShowMobile, setFieldShowMobile] = useState<Field[]>([]);
  const [propertyClass, setPropertyClass] = useState<PropertyResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingTop, setIsRefreshingTop] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const fieldActiveRef = useRef<Field[]>([]);
  const propertyClassRef = useRef<PropertyResponse | undefined>(undefined);

  const { id, nameClass } = useParams();

  const navigation = useNavigation<StackNavigation<"AssetListHistory">>();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handlePress = useCallback(
    async (item: Record<string, any>) => {
      const currentIndex = historyItems.findIndex((x) => x.id === item.id);
      const previousId =
        currentIndex < historyItems.length - 1
          ? historyItems[currentIndex + 1].id
          : null;

      try {
        navigation.navigate("AssetHistoryDetail", {
          id: item.id,
          id_previous: previousId,
          field: JSON.stringify(fieldActive),
          nameClass: nameClass!,
          idRoot: id,
          rootRecordLabel,
        });
      } catch (e) {
        error(e);
        showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    },
    [
      fieldActive,
      historyItems,
      id,
      isMounted,
      nameClass,
      navigation,
      rootRecordLabel,
      showAlertIfActive,
    ],
  );

  /* `get-list-history` trả trọn lịch sử một lần, không phân trang (xem
     `getListHistory`), nên ở đây không có tải thêm — nhánh load-more cũ chỉ
     gọi lại đúng request này rồi nối trùng cả danh sách. */
  const fetchData = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      if (!nameClass || !id) return;

      const isRefresh = options?.isRefresh;
      const shouldReloadFieldConfig =
        isRefresh || fieldActiveRef.current.length === 0;
      const shouldReloadPropertyClass = isRefresh || !propertyClassRef.current;

      if (!isRefresh) setIsLoading(true);

      try {
        if (shouldReloadFieldConfig) {
          const responseFieldActive = await getFieldActive(nameClass);
          const activeFields = responseFieldActive?.data || [];
          fieldActiveRef.current = activeFields;
          setFieldActive(activeFields);
          setFieldShowMobile(
            activeFields.filter((f: { isShowMobile: any }) => f.isShowMobile),
          );
        }

        if (shouldReloadPropertyClass) {
          const responsePropertyClass = await getPropertyClass(nameClass);
          const nextPropertyClass = responsePropertyClass?.data;
          propertyClassRef.current = nextPropertyClass;
          setPropertyClass(nextPropertyClass);
        }

        const response = await getListHistory(id, nameClass);
        let newItems: Record<string, any>[] = response?.data || [];
        newItems = orderBy(newItems, ["log_StartDate"], ["desc"]);

        setHistoryItems(newItems);
        setLoadErrorMessage(null);
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        setHistoryItems([]);
        setLoadErrorMessage(LOAD_ERROR_MESSAGE);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsRefreshingTop(false);
        }
      }
    },
    [id, isMounted, nameClass],
  );

  useEffect(() => {
    if (!nameClass || !id) return;
    fetchData();
  }, [nameClass, id, fetchData]);

  useNetworkAwareReload(fetchData, {
    hasError: Boolean(loadErrorMessage),
    refetchOnAppResume: true,
    onOffline: () => {
      setLoadErrorMessage(LOAD_ERROR_MESSAGE);
    },
  });

  const refreshTop = async () => {
    if (isRefreshingTop) return;

    setIsRefreshingTop(true);

    await fetchData({ isRefresh: true });
  };

  // Dọn lỗi trước: còn lịch sử cũ thì danh sách cũ hiện trong lúc gọi lại,
  // không thì khung chờ (fetchData tự bật `isLoading`) thay chỗ màn lỗi.
  const retryLoad = () => {
    setLoadErrorMessage(null);
    fetchData();
  };

  if (
    shouldShowListSkeleton({
      isFetching: isLoading,
      isEmpty: historyItems.length === 0,
      isRefreshing: isRefreshingTop,
    })
  ) {
    /* Đo từ `ListCardHistory`: mỗi dòng `paddingTop` 5 + chữ 14 cao ~16.7
       (iOS) + `marginBottom` 4, thẻ ~84 với avatar ở đỉnh — nhịp mặc định chỉ
       80. Khối thẻ lấy đúng `listContent` (`paddingTop` 14) của danh sách. */
    return (
      <RecordListSkeleton
        lines={2}
        lineHeight={5 + 16.7 + 4}
        avatarAlign="top"
        contentStyle={styles.listContent}
      />
    );
  }

  if (loadErrorMessage) {
    return (
      <View style={styles.emptyStateRoot}>
        <AssetListEmptyState
          iconName="cloud-offline-outline"
          title="Không thể tải lịch sử"
          subtitle={loadErrorMessage}
          actionLabel="Thử lại"
          onActionPress={retryLoad}
        />
      </View>
    );
  }

  const isEmpty = historyItems.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={historyItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ListCardHistory
            item={item}
            fields={fieldShowMobile}
            icon={propertyClass?.iconMobile || ""}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingTop}
            onRefresh={refreshTop}
            colors={[BRAND_RED]}
            tintColor={BRAND_RED}
            progressViewOffset={50}
          />
        }
        scrollEventThrottle={16}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName="time-outline"
            title="Chưa có lịch sử"
            subtitle="Dữ liệu thay đổi sẽ được hiển thị tại đây khi có phát sinh."
          />
        }
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...makeSharedAssetListStyles(c),
    container: { flex: 1, backgroundColor: c.bg },
    listContent: {
      flexGrow: 1,
      paddingTop: 14,
      paddingBottom: 20,
    },
    listContentEmpty: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    emptyStateRoot: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
  });
