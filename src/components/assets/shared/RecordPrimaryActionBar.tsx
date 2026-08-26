import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  AssetItem,
  AssetReturnTo,
  Field,
  MenuItemResponse,
  StackNavigation,
} from "../../../types";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import { useParams } from "../../../hooks/useParams";
import { useRelatedRecordCount } from "../../../hooks/useRelatedRecordCount";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import AddChildClassSheet from "./AddChildClassSheet";
import { getRecordLabel } from "../detailActions/useAssetRecordActions";
import { BRAND_RED } from "./listTheme";
import {
  getAddChildIcon,
  getAddChildLabel,
  isDanhGiaClass,
  useOpenAddRelatedForm,
} from "./useOpenAddRelatedForm";

type RecordPrimaryActionBarProps = {
  fieldActive?: Field[];
  item: AssetItem | null | undefined;
  /** Màn danh sách con của luồng đang đứng: QR có màn riêng. */
  listRoute: "QrReview" | "AssetRelatedList";
  nameClass?: string;
  /** Nơi màn tạo quay về sau khi lưu. */
  returnTo: AssetReturnTo;
};

const NETWORK_MESSAGE = "Vui lòng kiểm tra kết nối mạng rồi thử lại.";

/**
 * Thanh hành động chính ở đáy màn chi tiết bản ghi.
 *
 * Trước đây việc thường làm nhất sau khi quét một thiết bị — ghi một lần đánh
 * giá — nằm trong menu ⋯ rồi còn phải qua màn danh sách để bấm nút thêm. Thanh
 * này đưa nó ra ngoài và vào thẳng màn tạo; danh sách thành đường phụ ("lịch sử"),
 * vì xem lại là việc ít hơn nhiều so với ghi mới.
 *
 * Là flex sibling chứ không phải `position: absolute`: mỗi tab có luồng cuộn
 * riêng (thông tin, chi tiết, lịch sử, tệp), thanh nổi sẽ phải chừa khoảng ở cả
 * bốn chỗ mới không che dòng cuối.
 */
export default function RecordPrimaryActionBar({
  fieldActive,
  item,
  listRoute,
  nameClass,
  returnTo,
}: RecordPrimaryActionBarProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigation<"AssetDetails">>();
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const { groupMenuId, viewPermission, assetTitleHeader } = useParams();
  const { filterInsertable, loadChildClasses, openAddForm, pickPrimaryChildClass } =
    useOpenAddRelatedForm();

  const [busy, setBusy] = useState(false);
  const [childClasses, setChildClasses] = useState<MenuItemResponse[] | null>(
    null,
  );
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChildClasses(null);

    if (!nameClass) return;

    loadChildClasses(nameClass)
      .then((items) => {
        if (!cancelled) setChildClasses(items);
      })
      .catch((e) => {
        // Không có danh mục con thì không có thanh này; lỗi ở đây chỉ là "chưa
        // biết", không phải việc người dùng đang làm nên không báo.
        if (!isNetworkRequestError(e)) error(e);
      });

    return () => {
      cancelled = true;
    };
  }, [loadChildClasses, nameClass]);

  const allowedChildClasses = useMemo(
    () => filterInsertable(childClasses),
    [childClasses, filterInsertable],
  );

  const primaryChildClass = useMemo(
    () => pickPrimaryChildClass(nameClass, allowedChildClasses),
    [allowedChildClasses, nameClass, pickPrimaryChildClass],
  );

  const relatedCount = useRelatedRecordCount({
    enabled: Boolean(primaryChildClass),
    idRoot: item?.id ? String(item.id) : undefined,
    nameClass: primaryChildClass?.name,
    propertyReference: primaryChildClass?.propertyReference,
  });

  const goToAddForm = useCallback(
    async (childClass: MenuItemResponse) => {
      if (!item) return;

      setBusy(true);
      try {
        await openAddForm({
          assetContext: { assetTitleHeader, groupMenuId, viewPermission },
          childClass,
          item,
          parentFieldActive: fieldActive,
          parentNameClass: nameClass,
          returnTo,
        });
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        showAlertIfActive(
          "Lỗi",
          `Không thể mở màn thêm mới cho ${childClass.label}. ${NETWORK_MESSAGE}`,
        );
      } finally {
        if (isMounted()) setBusy(false);
      }
    },
    [
      assetTitleHeader,
      fieldActive,
      groupMenuId,
      isMounted,
      item,
      nameClass,
      openAddForm,
      returnTo,
      showAlertIfActive,
      viewPermission,
    ],
  );

  const openRelatedList = useCallback(() => {
    if (!item?.id || !primaryChildClass?.propertyReference) return;

    navigation.navigate(listRoute, {
      nameClass: primaryChildClass.name,
      propertyReference: primaryChildClass.propertyReference,
      idRoot: String(item.id),
      nameClassRoot: nameClass,
      titleHeader: primaryChildClass.moTa ?? "Danh sách",
      ...(listRoute === "AssetRelatedList"
        ? {
            rootRecordLabel: getRecordLabel(item, fieldActive),
            groupMenuId,
            viewPermission,
            assetTitleHeader,
          }
        : {}),
    } as never);
  }, [
    assetTitleHeader,
    fieldActive,
    groupMenuId,
    item,
    listRoute,
    nameClass,
    navigation,
    primaryChildClass,
    viewPermission,
  ]);

  // Chưa biết có danh mục con nào (đang tải / quyền chưa nạp) hoặc biết chắc là
  // không có: không dựng thanh, để nguyên màn như trước.
  if (!item || !allowedChildClasses || allowedChildClasses.length === 0) {
    return null;
  }

  const primaryLabel = getAddChildLabel(
    primaryChildClass ? [primaryChildClass] : allowedChildClasses,
  );
  const primaryIcon = getAddChildIcon(
    primaryChildClass ? [primaryChildClass] : allowedChildClasses,
  );

  const secondaryLabel = primaryChildClass
    ? isDanhGiaClass(primaryChildClass.name)
      ? "Lịch sử đánh giá"
      : `Danh sách ${(primaryChildClass.moTa || "").toLowerCase()}`.trim()
    : null;

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        disabled={busy}
        onPress={() => {
          if (primaryChildClass) {
            goToAddForm(primaryChildClass);
            return;
          }
          setSheetVisible(true);
        }}
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.primaryPressed,
          busy && styles.primaryBusy,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={primaryIcon} size={20} color="#fff" />
        )}
        <Text style={styles.primaryLabel}>{primaryLabel}</Text>
      </Pressable>

      {secondaryLabel ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          onPress={openRelatedList}
          style={({ pressed }) => [
            styles.secondary,
            pressed && styles.secondaryPressed,
          ]}
        >
          <Text style={styles.secondaryLabel} numberOfLines={1}>
            {secondaryLabel}
            {typeof relatedCount === "number" ? ` (${relatedCount})` : ""}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND_RED} />
        </Pressable>
      ) : null}

      <AddChildClassSheet
        items={allowedChildClasses}
        onClose={() => setSheetVisible(false)}
        onSelect={(childClass) => {
          setSheetVisible(false);
          goToAddForm(childClass);
        }}
        recordLabel={getRecordLabel(item, fieldActive)}
        visible={sheetVisible}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingHorizontal: 14,
      paddingTop: 10,
      gap: 6,
    },
    primary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: c.red,
      borderRadius: 14,
      paddingVertical: 13,
    },
    primaryPressed: {
      opacity: 0.85,
    },
    primaryBusy: {
      opacity: 0.7,
    },
    primaryLabel: {
      color: "#fff",
      fontSize: 14.5,
      fontWeight: "700",
      letterSpacing: 0.1,
    },
    secondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingVertical: 6,
    },
    secondaryPressed: {
      opacity: 0.6,
    },
    secondaryLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: BRAND_RED,
    },
  });
