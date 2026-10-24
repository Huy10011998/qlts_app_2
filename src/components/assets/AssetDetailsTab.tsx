import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  MenuItemResponse,
  StackNavigation,
  StackRoute,
} from "../../types";
import { getClassReference } from "../../services";
import Ionicons from "react-native-vector-icons/Ionicons";
import MenuCardSkeleton from "../ui/MenuCardSkeleton";
import EmptyState from "../ui/EmptyState";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useParams } from "../../hooks/useParams";
import { BRAND_RED } from "./shared/listTheme";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { normalizeIconImageUri } from "../../utils/iconImage";
import {
  buildRelatedConditions,
  getWorkflowListRoute,
  type WorkflowRelatedFilter,
} from "../../screens/Workflow/shared/workflowRelated";

const LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối mạng rồi bấm Thử lại.";

export default function AssetDeTailsTab({
  nameClassRoot,
  rootRecordLabel,
}: {
  nameClassRoot?: string;
  /** Mã bản ghi đang xem, chuyển tiếp cho header danh sách con. */
  rootRecordLabel?: string;
}) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"AssetDetails">>();
  const route = useRoute<StackRoute<"AssetDetails">>();

  const { id, nameClass } = route.params;
  const { groupMenuId, viewPermission, assetTitleHeader } = useParams();
  const { isMounted } = useSafeAlert();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MenuItemResponse[]>([]);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");

      const response = await getClassReference(nameClass);
      const data = response?.data;

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu trả về không hợp lệ");
      }

      setItems(
        data.map((item: any): MenuItemResponse => {
          const iconImageUri = normalizeIconImageUri(item.iconMobile);

          return {
            ...item,
            label: item.moTa ?? "Không có mô tả",
            icon: "document-text-outline",
            iconImageUri,
          };
        }),
      );
      setLoadErrorMessage(null);
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);
      setItems([]);
      setLoadErrorMessage(LOAD_ERROR_MESSAGE);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [id, isMounted, nameClass]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useNetworkAwareReload(fetchDetails, {
    hasError: Boolean(loadErrorMessage),
    refetchOnAppResume: true,
    onOffline: () => {
      setItems([]);
      setLoadErrorMessage(LOAD_ERROR_MESSAGE);
    },
  });

  const handlePress = (item: MenuItemResponse) => {
    // Công việc / Kế hoạch: BE chặn get-list chung (400), đọc qua màn Workflow.
    const workflowRoute = getWorkflowListRoute(item.name);
    const related: WorkflowRelatedFilter = {
      property: item.propertyReference,
      idRoot: String(id),
      nameClassRoot,
      rootRecordLabel,
      groupMenuId,
      viewPermission,
      assetTitleHeader,
    };

    if (workflowRoute && buildRelatedConditions(related).length) {
      navigation.navigate(workflowRoute, {
        titleHeader: item.moTa ?? undefined,
        related,
      });
      return;
    }

    navigation.navigate("AssetRelatedList", {
      nameClass: item.name,
      propertyReference: item.propertyReference,

      idRoot: id,
      nameClassRoot: nameClassRoot,
      rootRecordLabel,
      titleHeader: item.moTa ?? "Danh sách",
      groupMenuId,
      viewPermission,
      assetTitleHeader,
    });
  };

  const renderItem = ({ item }: { item: MenuItemResponse }) => (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.iconWrap}>
        {item.iconImageUri ? (
          <Image source={{ uri: item.iconImageUri }} style={styles.iconImage} />
        ) : (
          <Ionicons name={item.icon as any} size={18} color={BRAND_RED} />
        )}
      </View>
      <Text style={styles.label}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
    </Pressable>
  );

  if (isLoading) {
    // Đúng dáng dòng thật bên dưới: thẻ 56 + 8, mũi tên trơn, lề trên 14 như
    // `listContent` — dáng thẻ menu mặc định lệch cả ba chỗ.
    return <MenuCardSkeleton variant="related" paddingTop={14} />;
  }

  const isEmpty = items.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName={
              loadErrorMessage ? "cloud-offline-outline" : "albums-outline"
            }
            title={
              loadErrorMessage
                ? "Không thể tải dữ liệu liên quan"
                : "Không có dữ liệu liên quan"
            }
            subtitle={
              loadErrorMessage ||
              "Danh mục liên kết sẽ hiển thị tại đây khi có dữ liệu"
            }
            // `fetchDetails` tự bật khung chờ nên bấm là thấy đang tải lại ngay.
            actionLabel={loadErrorMessage ? "Thử lại" : undefined}
            onActionPress={loadErrorMessage ? fetchDetails : undefined}
          />
        }
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 96,
    },
    listContentEmpty: {
      flexGrow: 1,
      paddingTop: 0,
      paddingBottom: 0,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 14,
      marginBottom: 8,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      gap: 10,
    },
    itemPressed: {
      opacity: 0.75,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    iconImage: {
      width: 24,
      height: 24,
      resizeMode: "contain",
    },
    label: {
      flex: 1,
      fontSize: 13.5,
      color: c.text,
      fontWeight: "600",
    },
  });
