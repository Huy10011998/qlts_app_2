import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";

/**
 * Bốn dáng dòng bản ghi có thật trong app — đo từ chính các thẻ đang chạy:
 *
 * - `avatar`: avatar tròn 48 + N dòng field. Dùng cho 6 màn, vì
 *   `noiDiaListStyles.ts` cố ý copy đúng số đo của `ListCardAsset`.
 * - `compact`: một dòng, không avatar — thẻ gập/mở của lịch sử trung chuyển.
 * - `row`: không avatar, có chevron, khoảng cách bằng `gap` chứ margin — dòng
 *   chọn trong danh sách Nội địa.
 * - `plain`: KHÔNG phải thẻ — dòng trong suốt ngăn nhau bằng một gạch mảnh, nằm
 *   thẳng trên nền sheet. Danh sách nhân viên của sheet điểm danh.
 */
export type RecordCardVariant = "avatar" | "compact" | "row" | "plain";

/**
 * Thứ nằm cuối thẻ: mũi nhọn mở chi tiết, nút bấm ("Xem" ở thẻ tệp), icon trạng
 * thái kèm giờ, hoặc không có gì. Một prop thay vì mỗi dáng một boolean, để thêm
 * dáng mới không thành một dãy cờ loại trừ nhau.
 */
export type RecordCardTrailing = "none" | "chevron" | "button" | "status";

const LINE_HEIGHT = 21;
const AVATAR_CARD_PADDING = 16 * 2 + 6 * 2;
/** Vạch đầu là nhãn chính nên cao hơn — xem `lineTitle` trong `makeStyles`. */
const LINE_TITLE_HEIGHT = 14;
const LINE_GAP = 7;

/** Chiều cao riêng cụm vạch chữ, KHÔNG gồm padding của thẻ. */
const getLinesHeight = (lines: number) =>
  LINE_TITLE_HEIGHT + Math.max(0, lines - 1) * (12 + LINE_GAP);

/**
 * Chiều cao một thẻ **kể cả khoảng cách xuống thẻ dưới**, để bên ngoài đếm được
 * số thẻ vừa phủ kín khung.
 */
export const getRecordCardHeight = (
  variant: RecordCardVariant,
  lines: number,
) => {
  if (variant === "compact") return 48 + 12;
  if (variant === "row") return Math.max(52, 24 + lines * LINE_HEIGHT) + 8;
  /* `plain` không có lề ngoài nên chiều cao thẻ cũng chính là bước lặp — và vì
     dòng thật chỉ cao hơn 52 một chút, ở đây đo đúng cụm vạch thay vì ước lượng
     như hai dáng trên: lệch 9pt mỗi dòng là hụt hẳn một dòng cuối màn. */
  if (variant === "plain")
    return Math.max(52, 10 * 2 + getLinesHeight(lines));

  return Math.max(48, lines * LINE_HEIGHT) + AVATAR_CARD_PADDING;
};

/**
 * Khung xám hình dáng một thẻ bản ghi.
 *
 * Khác `MenuCardSkeleton` (thẻ menu 58pt, một dòng nhãn + chevron): thẻ bản ghi
 * cao 90–150pt, có avatar tròn 48 và nhiều dòng field, nên không dùng lại được —
 * đem khung thẻ menu vào danh sách bản ghi thì lúc dữ liệu về sẽ nhảy layout.
 *
 * `lines` là số dòng field. Ba màn dùng `ListCardAsset` (`AssetList`,
 * `AssetRelatedList`, `QrReview`) KHÔNG biết trước con số này — nó bằng
 * `fieldShowMobile.length`, chỉ có sau `getFieldActive` — nên mặc định 3 là số
 * ĐOÁN, không phải số đo. Các màn còn lại truyền đúng số dòng hard-code của mình.
 */
export default function RecordCardSkeleton({
  variant = "avatar",
  lines = 3,
  trailing = "none",
  separator = false,
  opacity,
}: {
  variant?: RecordCardVariant;
  lines?: number;
  trailing?: RecordCardTrailing;
  /**
   * Gạch ngăn phía trên. Chỉ dáng `plain` dùng — và dòng đầu KHÔNG có, giống
   * `isFirst` của danh sách thật.
   */
  separator?: boolean;
  /** Nhịp nhấp nháy do danh sách cấp, để mọi thẻ sáng tối cùng nhau. */
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <Animated.View
      style={[
        styles.card,
        variant === "compact" && styles.cardCompact,
        variant === "row" && styles.cardRow,
        variant === "plain" && styles.cardPlain,
        separator && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.hairline,
        },
        { borderColor: colors.hairline, opacity },
      ]}
    >
      {variant === "avatar" ? <View style={styles.avatar} /> : null}

      <View style={styles.lines}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.line,
              // Dòng đầu là nhãn chính nên đậm và dài hơn; các dòng sau dài ngắn
              // khác nhau cho giống bản ghi thật.
              index === 0 && styles.lineTitle,
              index % 3 === 2 && styles.lineShort,
            ]}
          />
        ))}
      </View>

      {trailing === "chevron" ? <View style={styles.chevron} /> : null}
      {trailing === "button" ? <View style={styles.button} /> : null}
      {trailing === "status" ? (
        <View style={styles.status}>
          <View style={styles.statusIcon} />
          <View style={styles.statusText} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginHorizontal: 12,
      marginVertical: 6,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
    },
    cardCompact: {
      paddingVertical: 14,
    },
    cardRow: {
      gap: 12,
      marginHorizontal: 0,
      marginVertical: 0,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    // Không nền, không viền, không bo góc: dòng thật nằm thẳng trên nền sheet và
    // chỉ ngăn nhau bằng gạch mảnh, vẽ thành thẻ trắng là dựng ra một khối hộp
    // mà lúc dữ liệu về sẽ biến mất.
    cardPlain: {
      gap: 10,
      minHeight: 52,
      marginHorizontal: 0,
      marginVertical: 0,
      paddingVertical: 10,
      paddingHorizontal: 0,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: "transparent",
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.skeleton,
    },
    lines: {
      flex: 1,
      gap: 7,
    },
    line: {
      width: "72%",
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    lineTitle: {
      width: "52%",
      height: 14,
    },
    lineShort: {
      width: "38%",
    },
    chevron: {
      width: 18,
      height: 18,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    button: {
      width: 46,
      height: 26,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    status: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 5,
      minWidth: 76,
    },
    statusIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.skeleton,
    },
    statusText: {
      width: 42,
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
  });
