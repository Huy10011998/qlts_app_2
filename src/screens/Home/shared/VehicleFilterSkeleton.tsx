import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../../../components/ui/useSkeletonAutoFill";

/**
 * Khung chờ phần lọc của ba màn Phương tiện (dừng đỗ, hành trình, vị trí hiện
 * tại), lúc chờ danh sách phương tiện.
 *
 * Trước đây cả ba đều là vòng xoay giữa màn kèm chữ "Đang tải phương tiện...".
 * Nhưng phần chờ xong lại KHÔNG phụ thuộc dữ liệu: nhãn, ô chọn với chữ mờ
 * "Phương tiện", hai ô ngày và hàng nút đều là bố cục tĩnh — danh sách xe chỉ
 * dùng cho bảng chọn mở ra sau khi bấm. Nên ở đây dựng lại đúng chúng.
 *
 * Chữ tĩnh thì hiện THẬT (nhãn field, chữ trên nút): đó là thông tin người dùng
 * đọc được ngay, tô xám chỉ để giấu đi một thứ đã sẵn sàng. Chỉ chỗ nào rồi sẽ
 * là dữ liệu — tên xe trong ô chọn, ngày trong hai ô ngày — mới tô xám.
 *
 * Ba màn khác nhau ở phần dưới ô chọn nên khai bằng props, giống cách
 * `RecordListSkeleton` cho mỗi màn khai phần header của mình.
 */
export default function VehicleFilterSkeleton({
  hasDateRange = false,
  actionLabels = [],
  actionColors = [],
  hasListArea = false,
}: {
  /** Hai ô "Từ ngày" / "Đến ngày" — màn dừng đỗ và hành trình có, vị trí thì không. */
  hasDateRange?: boolean;
  /** Chữ trên các nút hành động, theo đúng thứ tự của màn thật. */
  actionLabels?: string[];
  /** Màu nền từng nút, cùng thứ tự với `actionLabels`. */
  actionColors?: string[];
  /** Khung danh sách/bản đồ bên dưới. Bỏ trống thì chỉ chừa chỗ trống. */
  hasListArea?: boolean;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { opacity } = useSkeletonAutoFill(1, 1);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg }]}
      accessibilityLabel="Đang tải phương tiện"
    >
      <Text style={[styles.label, { color: colors.text }]}>Phương tiện</Text>

      {/* Ô chọn thật là hộp TRẮNG có viền, chữ "Phương tiện" bên trong là chữ mờ
          của placeholder — dựng lại y hệt, chỉ khác là chưa bấm được. */}
      <View
        style={[
          styles.select,
          { backgroundColor: colors.surface, borderColor: colors.borderStrong },
        ]}
      >
        <Ionicons name="car-outline" size={20} color={colors.textSecondary} />
        <Animated.View style={[styles.selectText, { opacity }]} />
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.textSecondary}
        />
      </View>

      {hasDateRange ? (
        <View style={styles.dateRow}>
          {["Từ ngày", "Đến ngày"].map((dateLabel) => (
            <View key={dateLabel} style={styles.dateField}>
              <Text style={[styles.label, { color: colors.text }]}>
                {dateLabel}
              </Text>
              <Animated.View
                style={[
                  styles.dateBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderStrong,
                    opacity,
                  },
                ]}
              >
                <View style={styles.dateBoxText} />
              </Animated.View>
            </View>
          ))}
        </View>
      ) : null}

      {actionLabels.length > 0 ? (
        <View style={styles.actionRow}>
          {actionLabels.map((actionLabel, index) => (
            <View
              key={actionLabel}
              style={[
                styles.action,
                { backgroundColor: actionColors[index] ?? colors.slate },
              ]}
            >
              <Text style={styles.actionText}>{actionLabel}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasListArea ? (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />
      ) : (
        <View style={styles.filler} />
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      // Khung danh sách dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 7,
    },
    select: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48,
      marginBottom: 16,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 8,
    },
    selectText: {
      flex: 1,
      height: 13,
      maxWidth: "58%",
      marginHorizontal: 10,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    dateRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    dateField: {
      flex: 1,
    },
    dateBox: {
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 8,
    },
    dateBoxText: {
      width: "72%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },
    action: {
      flex: 1,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    actionText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "600",
    },
    list: {
      flex: 1,
      minHeight: 280,
      borderWidth: 1,
      borderRadius: 14,
    },
    filler: {
      flex: 1,
    },
  });
