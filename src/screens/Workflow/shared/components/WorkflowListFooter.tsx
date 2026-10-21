import React from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import RecordListFooterSkeleton from "../../../../components/list/RecordListFooterSkeleton";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

type Props = {
  /** Kết quả `useWorkflowPagedList` của danh sách. */
  list: {
    items: unknown[];
    loadingMore: boolean;
    errorMessage: string | null;
    loadMoreFailed: boolean;
    retry: () => void;
  };
  /** Lề thẻ của khung chờ (xem `RecordListFooterSkeleton`). */
  cardStyle?: StyleProp<ViewStyle>;
  /**
   * Khung chờ đúng dáng dòng của màn (thẻ Quy trình, dòng Thông báo…). Bỏ trống
   * thì dùng thẻ bản ghi chung — dáng thẻ tài sản, lệch với các thẻ Workflow.
   */
  skeleton?: React.ReactNode;
};

/**
 * Chân danh sách phân trang: khung chờ lúc đang nạp trang kế; lượt nạp hỏng mà
 * danh sách đã có dòng thì hiện "Không tải thêm được · Thử lại".
 *
 * Trước đây lỗi chỉ hiện ở `ListEmptyComponent` (danh sách rỗng) — cuộn tới cuối
 * mà mất mạng thì danh sách dừng im, người dùng tưởng đã hết dữ liệu.
 */
export default function WorkflowListFooter({
  list,
  cardStyle,
  skeleton,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  if (list.loadingMore)
    return skeleton ?? <RecordListFooterSkeleton cardStyle={cardStyle} />;
  if (!list.errorMessage || !list.items.length) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={list.retry}
      style={styles.row}
      accessibilityRole="button"
      accessibilityHint={list.errorMessage}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={c.textSub} />
      <Text style={styles.text} numberOfLines={2}>
        {list.loadMoreFailed ? "Không tải thêm được" : "Không làm mới được"}
        {" · "}
        <Text style={styles.retry}>Thử lại</Text>
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    text: {
      flexShrink: 1,
      fontSize: 13,
      color: c.textSub,
    },
    retry: {
      fontWeight: "700",
      color: c.red,
    },
  });
