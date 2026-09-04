import React, { useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * Màn này là một chặng của vòng quét mã.
   *
   * Hai hệ quả: bảng chọn việc tự mở ngay khi vào màn (quét xong là để làm việc gì
   * đó, không phải để đọc), và việc nào có màn lịch sử riêng thì đi thẳng vào form
   * tạo — đang quét cái thứ 12 thì không ai muốn xem lại lịch sử.
   */
  scanFlow?: boolean;
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
  scanFlow = false,
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
    nameClassRoot: primary?.review?.count?.nameClassRoot,
  });

  const runAction = useCallback(
    async (action: RecordAction) => {
      setBusy(true);
      try {
        await action.run({ quick: scanFlow });
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
    [isMounted, scanFlow, showAlertIfActive],
  );

  // Bảng chọn tự mở đúng một lần cho mỗi bản ghi: mở lại mỗi khi danh sách việc
  // tính lại thì người dùng vừa đóng đi là nó bật lên ngay.
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!scanFlow || autoOpenedRef.current) return;
    // Chỉ có đúng một việc thì không cần hỏi — nút chính đã là việc đó.
    if (!actions || actions.length < 2) return;

    autoOpenedRef.current = true;
    setSheetVisible(true);
  }, [actions, scanFlow]);

  // `null` = chưa biết (đang tải / quyền chưa nạp): chưa dựng gì để khỏi loé một
  // thanh rỗng. `[]` = biết chắc không có việc nào.
  if (!item || !actions || actions.length === 0) return null;

  // Không có việc chính nghĩa là bản ghi làm được nhiều việc: nút mở bảng chọn.
  // Trước đây chỗ này vừa có nút "Chọn thao tác" vừa có dòng "Thao tác khác (n)",
  // hai cái mở CÙNG một bảng với CÙNG một danh sách.
  const primaryLabel = primary
    ? primary.label
    : `Chọn thao tác (${actions.length})`;
  const primaryIcon = primary?.icon ?? "ellipsis-horizontal-circle-outline";
  const recordLabel = getRecordLabel(item, fieldActive);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        disabled={busy}
        onPress={() => {
          // Nhiều việc thì không đoán bừa cái nào là chính — mở bảng cho chọn.
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

      {/*
        Đường xem lại chỉ có khi biết chắc việc chính là gì — mới đếm được số bản
        ghi bằng đúng một request. Nhiều việc thì bỏ, chứ đếm cho từng việc là mỗi
        lần vào màn tốn ngần ấy request.
      */}
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

      <RecordActionSheet
        actions={actions}
        onClose={() => setSheetVisible(false)}
        onSelect={(action) => {
          setSheetVisible(false);
          runAction(action);
        }}
        recordLabel={recordLabel}
        title={scanFlow ? "Làm gì với thiết bị này?" : "Chọn thao tác"}
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
