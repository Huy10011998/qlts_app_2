import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import SkeletonBlock from "../../components/ui/SkeletonBlock";
import { useSkeletonAutoFill } from "../../components/ui/useSkeletonAutoFill";
import { AppColors, useStyles } from "../../utils/helpers/colors";

/*
 * Cao một dòng chữ ở cỡ chữ mặc định của app (font hệ thống ≈ 1.19 × cỡ chữ).
 * Đo theo ba dòng của `ThongBaoRow`: tiêu đề 14, nội dung 13, dòng nhóm · giờ
 * 11.5. Tiêu đề / nội dung cho tới 2 dòng, nhưng mẫu thật của BE ("Bạn được
 * giao Chủ trì: CV.000016" / "Kiểm kê kho · hạn 15/10/2026 17:00") vừa một dòng
 * nên khung chờ dựng mỗi phần một dòng.
 */
const TITLE_LINE = 17;
const CONTENT_LINE = 15.5;
const META_LINE = 13.5;

/** `paddingVertical` của dòng thật. */
const ROW_PADDING = 12;

/**
 * Chiều cao một dòng thông báo **kể cả gạch mảnh ở đáy** — dòng nằm sát nhau,
 * không có lề, nên đây cũng là bước lặp để đếm số dòng phủ kín khung (≈ 76pt).
 * Cột chữ (17 + 2 + 15.5 + 4 + 13.5 = 52) cao hơn icon 38 nên quyết định chiều cao.
 */
export const THONG_BAO_ROW_HEIGHT =
  ROW_PADDING * 2 +
  TITLE_LINE +
  2 +
  CONTENT_LINE +
  4 +
  META_LINE +
  StyleSheet.hairlineWidth;

/**
 * Vạch xám cao `bar` đứng giữa một dòng chữ cao `line`, cách dòng trên `gap`
 * (đúng `marginTop` của dòng chữ thật) — tổng chiều cao bằng đúng dòng chữ.
 */
const barInLine = (line: number, bar: number, gap = 0): ViewStyle => ({
  height: bar,
  marginTop: gap + (line - bar) / 2,
  marginBottom: (line - bar) / 2,
  borderRadius: bar / 2,
});

/**
 * Khung chờ danh sách thông báo — đúng dáng `ThongBaoRow`: dòng phẳng tràn
 * ngang nền trắng, ngăn nhau bằng gạch mảnh, icon tròn 38 bên trái, ba dòng
 * chữ. Trước đây màn "Xem tất cả" mượn thẻ bản ghi tài sản (thẻ nổi bo góc, lề
 * 12, avatar 48, ≈ 92pt mỗi thẻ) nên lúc dữ liệu về cả danh sách đổi dáng và co
 * lại.
 *
 * Chấm xanh "chưa đọc" không vẽ: chưa biết dòng nào chưa đọc, và chấm nằm giữa
 * cạnh phải nên không đổi chiều cao dòng.
 *
 * Hai cách dùng:
 * - bỏ trống `rows`: phủ kín khung (màn "Xem tất cả" lúc tải trang đầu);
 * - truyền `rows`: đúng số dòng đó, khung KHÔNG giãn (`flex`) — cho chân danh
 *   sách lúc nạp trang kế và cho bảng chuông, nơi chiều cao do chính nội dung
 *   quyết định nên phép tự đếm sẽ chạy vòng.
 */
export default function ThongBaoRowSkeleton({
  rows,
  accessibilityLabel = "Đang tải thông báo",
}: {
  rows?: number;
  accessibilityLabel?: string;
}) {
  const styles = useStyles(makeStyles);
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(
    THONG_BAO_ROW_HEIGHT,
    rows,
  );
  const fill = rows === undefined;

  return (
    <View
      style={fill ? styles.fill : undefined}
      onLayout={fill ? onLayout : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock opacity={opacity} style={styles.icon} />
          <View style={styles.body}>
            {/* Dài ngắn khác nhau cho giống chữ thật, không thành cột vạch đều. */}
            <SkeletonBlock
              opacity={opacity}
              style={[styles.title, index % 3 === 1 && styles.titleShort]}
            />
            <SkeletonBlock
              opacity={opacity}
              style={[styles.content, index % 2 === 1 && styles.contentLong]}
            />
            <SkeletonBlock opacity={opacity} style={styles.meta} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Số đo của `ThongBaoRow` (`row`, `icon`, `body`, `title`, `content`, `meta`).
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    fill: {
      flex: 1,
      // Dòng dựng vượt đáy khung thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingVertical: ROW_PADDING,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      marginRight: 12,
    },
    body: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      width: "68%",
      ...barInLine(TITLE_LINE, 13),
    },
    titleShort: {
      width: "52%",
    },
    content: {
      width: "78%",
      ...barInLine(CONTENT_LINE, 11, 2),
    },
    contentLong: {
      width: "88%",
    },
    meta: {
      width: "36%",
      ...barInLine(META_LINE, 9, 4),
    },
  });
