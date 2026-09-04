import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { useSkeletonAutoFill } from "./useSkeletonAutoFill";

/** Chiều cao một thẻ, gồm cả khoảng cách xuống thẻ dưới — xem `makeStyles`. */
const ROW_HEIGHT = 58 + 6;

/**
 * Khung xám nhấp nháy đúng hình dáng thẻ menu, dùng trong lúc tải.
 *
 * Thay cho vòng xoay giữa màn trắng: người dùng thấy ngay bố cục sắp hiện ra nên
 * cảm giác nhanh hơn, dù thời gian tải không đổi. Dùng cho mọi màn danh sách thẻ
 * (cây tài sản, cây camera).
 *
 * Số thẻ tự tính theo chiều cao thật của khung nên khung xám phủ kín màn: một số
 * dòng cố định sẽ chừa một vùng trống bên dưới trên máy màn lớn, nhìn như danh
 * sách đã tải xong mà thiếu dữ liệu. Thẻ cuối bị cắt ngang là có ý — giống danh
 * sách thật còn nội dung phía dưới.
 *
 * CHỈ vẽ khi màn chưa có gì để vẽ — dùng `shouldShowListSkeleton` để quyết định,
 * đừng chỉ hỏi "đang gọi API không": tải lại lúc danh sách đã có dữ liệu phải
 * diễn ra âm thầm.
 */
export default function MenuCardSkeleton({ rows }: { rows?: number }) {
  const styles = useStyles(makeStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(ROW_HEIGHT, rows);

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      accessibilityLabel="Đang tải danh sách"
    >
      {Array.from({ length: rowCount }).map((_, index) => (
        <Animated.View
          key={index}
          style={[styles.card, { borderColor: hairlineBorderColor, opacity }]}
        >
          <View style={styles.icon} />
          <View style={styles.lines}>
            {/* Dòng nhãn dài ngắn khác nhau cho giống danh sách thật. */}
            <View style={[styles.line, index % 3 === 0 && styles.lineShort]} />
          </View>
          <View style={styles.chevron} />
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra thành cuộn được.
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 58,
      marginBottom: 6,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    lines: {
      flex: 1,
    },
    line: {
      height: 12,
      width: "62%",
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    lineShort: {
      width: "42%",
    },
    chevron: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
  });
