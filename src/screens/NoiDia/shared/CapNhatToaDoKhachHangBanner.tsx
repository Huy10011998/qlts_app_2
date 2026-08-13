import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { formatKhoangCach, isKhoangCachXa } from "./noiDiaFormat";
import { useCapNhatToaDoKhachHang } from "./useCapNhatToaDoKhachHang";

/**
 * Cảnh báo mốc toạ độ khách hàng ở màn lịch sử xác nhận vị trí tủ lạnh.
 *
 * Chỉ hiện khi lượt xác nhận gần nhất cho thấy mốc có vấn đề: `khoangCachMet`
 * null (khách hàng chưa khai toạ độ nên server không tính được) hoặc vượt mốc
 * cảnh báo (mốc có thể sai). Người đang đứng ở điểm bán sửa mốc ngay tại đây,
 * không phải đi vòng qua màn chi tiết khách hàng.
 *
 * Quyền `Class.NoiDia_KhachHang.CapNhatToaDo` do `useCapNhatToaDoKhachHang`
 * kiểm — không có thì `canUpdate` false và cả banner ẩn, khỏi check lại ở đây.
 */
export default function CapNhatToaDoKhachHangBanner({
  idKhachHang,
  khachHang,
  khoangCachMet,
  hasHistory,
}: {
  idKhachHang: number;
  khachHang: string;
  khoangCachMet?: number | null;
  hasHistory: boolean;
}) {
  const styles = useStyles(makeStyles);
  const [isDone, setIsDone] = useState(false);
  // Mặc định thu gọn để nhường chỗ cho danh sách; bấm vào mở phần giải thích
  // đầy đủ — sửa mốc toạ độ là việc không hoàn tác được nên không giấu hẳn.
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSuccess = useCallback(() => setIsDone(true), []);

  const { busyLabel, canUpdate, isBusy, start } = useCapNhatToaDoKhachHang({
    onSuccess: handleSuccess,
  });

  // Chưa có lượt nào thì không có tín hiệu nào để kết luận mốc sai — im lặng.
  if (!hasHistory || !idKhachHang || !canUpdate || isDone) return null;

  const isMissing = khoangCachMet === null || khoangCachMet === undefined;
  const isFar = isKhoangCachXa(khoangCachMet);
  if (!isMissing && !isFar) return null;

  const message = isMissing
    ? "Khách hàng chưa có toạ độ nên không tính được khoảng cách."
    : `Lượt gần nhất cách khách hàng ${formatKhoangCach(
        khoangCachMet,
      )} — mốc toạ độ có thể sai.`;

  const tenKhachHang = khachHang || "khách hàng này";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="warning-outline" size={16} style={styles.icon} />

        <TouchableOpacity
          style={styles.content}
          onPress={() => setIsExpanded((prev) => !prev)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
            {message}
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isExpanded ? "Thu gọn" : "Xem chi tiết"}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              style={styles.toggleIcon}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isBusy && styles.buttonDisabled]}
          onPress={() => start({ id: idKhachHang, label: khachHang })}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={14} style={styles.buttonIcon} />
          <Text style={styles.buttonText} numberOfLines={1}>
            {busyLabel ?? "Cập nhật"}
          </Text>
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        <View style={styles.detail}>
          <Text style={styles.hint}>
            Khoảng cách ở mỗi lượt được tính từ mốc toạ độ đang lưu của{" "}
            {tenKhachHang}. Mốc lệch thì lượt nào cũng báo xa dù bạn đứng đúng
            chỗ.
          </Text>
          <Text style={styles.hint}>
            Chỉ bấm “Cập nhật” khi bạn ĐANG đứng tại điểm bán của {tenKhachHang}{" "}
            — app lấy vị trí hiện tại của bạn làm mốc mới cho khách hàng.
          </Text>
          <Text style={styles.hint}>
            Mốc mới chỉ ảnh hưởng các lượt xác nhận sau. Khoảng cách của những
            lượt đã ghi trong danh sách giữ nguyên.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    /**
     * Lúc thu gọn chỉ một hàng ngang: cảnh báo chiếm càng ít chỗ càng tốt vì thứ
     * người dùng vào đây để xem là danh sách lượt, không phải cái banner.
     */
    card: {
      marginHorizontal: 12,
      marginTop: 10,
      padding: 10,
      marginBottom: 6,
      borderRadius: 12,
      backgroundColor: c.amberLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.amberBorder,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    icon: {
      color: c.amber,
    },
    title: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.text,
    },
    /** Gợi ý còn nội dung bị giấu — không có nó thì không ai biết bấm vào được. */
    toggleRow: {
      marginTop: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    toggleText: {
      fontSize: 11.5,
      fontWeight: "600",
      color: c.amber,
    },
    toggleIcon: {
      color: c.amber,
    },
    detail: {
      marginTop: 8,
      paddingTop: 8,
      gap: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.amberBorder,
    },
    hint: {
      fontSize: 12,
      lineHeight: 17,
      color: c.textSecondary,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.amberBorder,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    buttonIcon: {
      color: c.amber,
    },
    buttonText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.amber,
    },
  });
