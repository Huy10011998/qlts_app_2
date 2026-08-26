import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AssetItem, AssetReturnTo, Field } from "../../../types";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import { useRelatedRecordCount } from "../../../hooks/useRelatedRecordCount";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { useRecordActions } from "../detailActions/recordActions/useRecordActions";
import type { RecordAction } from "../detailActions/recordActions/types";
import { getRecordLabel } from "../detailActions/useAssetRecordActions";
import RecordActionSheet from "./RecordActionSheet";
import { BRAND_RED } from "./listTheme";

type RecordActionBarProps = {
  fieldActive?: Field[];
  item: AssetItem | null | undefined;
  /** Màn danh sách bản ghi con của luồng đang đứng: QR có màn riêng. */
  listRoute: "QrReview" | "AssetRelatedList";
  nameClass?: string;
  /** Nơi màn tạo quay về sau khi lưu, khi bấm từ đây. */
  returnTo: AssetReturnTo;
};

const NETWORK_MESSAGE = "Vui lòng kiểm tra kết nối mạng rồi thử lại.";

/**
 * Thanh hành động ở đáy màn chi tiết bản ghi.
 *
 * Việc thường làm nhất sau khi quét một thiết bị (đánh giá, kiểm kê, báo hỏng…)
 * trước đây nằm trong menu ⋯ rồi còn phải qua màn danh sách mới bấm được nút
 * thêm. Thanh này đưa việc chính ra ngoài và vào thẳng màn tạo.
 *
 * Luôn chỉ hai dòng dù bản ghi làm được bao nhiêu việc: một nút chính, phần còn
 * lại vào bảng chọn. Xếp cả sáu nút cạnh nhau thì không còn cái nào là chính.
 *
 * Là flex sibling chứ không phải `position: absolute`: mỗi tab có luồng cuộn
 * riêng (thông tin, chi tiết, lịch sử, tệp), thanh nổi sẽ phải chừa khoảng ở cả
 * bốn chỗ mới không che dòng cuối.
 */
export default function RecordActionBar({
  fieldActive,
  item,
  listRoute,
  nameClass,
  returnTo,
}: RecordActionBarProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const { actions, primary } = useRecordActions({
    fieldActive,
    item,
    listRoute,
    nameClass,
    returnTo,
  });

  const [busy, setBusy] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const relatedCount = useRelatedRecordCount({
    enabled: Boolean(primary?.review?.count),
    idRoot: primary?.review?.count?.idRoot,
    nameClass: primary?.review?.count?.nameClass,
    propertyReference: primary?.review?.count?.propertyReference,
  });

  const runAction = useCallback(
    async (action: RecordAction) => {
      setBusy(true);
      try {
        await action.run({ quick: false });
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        showAlertIfActive(
          "Lỗi",
          `Không thể mở ${action.label.toLowerCase()}. ${NETWORK_MESSAGE}`,
        );
      } finally {
        if (isMounted()) setBusy(false);
      }
    },
    [isMounted, showAlertIfActive],
  );

  // Nút chính đã chiếm một việc thì bảng chọn không lặp lại nó nữa.
  const otherActions = useMemo(
    () => (actions ?? []).filter((action) => action.key !== primary?.key),
    [actions, primary],
  );

  // `null` = chưa biết (đang tải / quyền chưa nạp): chưa dựng gì để khỏi loé một
  // thanh rỗng. `[]` = biết chắc không có việc nào.
  if (!item || !actions || actions.length === 0) return null;

  const primaryLabel = primary?.label ?? "Chọn thao tác";
  const primaryIcon = primary?.icon ?? "ellipsis-horizontal-circle-outline";
  const recordLabel = getRecordLabel(item, fieldActive);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        disabled={busy}
        onPress={() => {
          // Không xác định được việc chính (nhiều việc, không việc nào ưu tiên)
          // thì nút chính mở bảng chọn thay vì đoán bừa.
          if (primary) {
            runAction(primary);
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

      <View style={styles.secondaryRow}>
        {primary?.review ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={primary.review.run}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.secondaryLabel} numberOfLines={1}>
              {primary.review.label}
              {typeof relatedCount === "number" ? ` (${relatedCount})` : ""}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={BRAND_RED} />
          </Pressable>
        ) : null}

        {otherActions.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => setSheetVisible(true)}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.secondaryLabel} numberOfLines={1}>
              Thao tác khác ({otherActions.length})
            </Text>
            <Ionicons name="chevron-forward" size={14} color={BRAND_RED} />
          </Pressable>
        ) : null}
      </View>

      <RecordActionSheet
        actions={primary ? otherActions : actions}
        onClose={() => setSheetVisible(false)}
        onSelect={(action) => {
          setSheetVisible(false);
          runAction(action);
        }}
        recordLabel={recordLabel}
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
      gap: 4,
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
    secondaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },
    secondary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 6,
      flexShrink: 1,
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
