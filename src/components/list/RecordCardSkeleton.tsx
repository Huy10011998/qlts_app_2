import React from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

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
 * - `compact`: một dòng, không avatar, ô mũi tên gập/mở 16 đứng đầu — thẻ gập/mở
 *   của lịch sử trung chuyển.
 * - `row`: không avatar, có chevron, khoảng cách bằng `gap` chứ margin — dòng
 *   chọn trong danh sách Nội địa. Thẻ không tự có lề: nơi gọi phải truyền đúng
 *   `padding` / `gap` của danh sách thật (`contentStyle` của `RecordListSkeleton`),
 *   không thì các dòng dính nhau và chạm hai mép màn.
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

const AVATAR_CARD_PADDING = 16 * 2 + 6 * 2;
/** Vạch đầu là nhãn chính nên cao hơn — xem `lineTitle` trong `makeStyles`. */
const LINE_TITLE_HEIGHT = 14;
const LINE_BAR_HEIGHT = 12;
const LINE_GAP = 7;
/** Ô mũi tên gập/mở đầu thẻ `compact` — icon caret 16 của lịch sử trung chuyển. */
const COMPACT_LEAD_SIZE = 16;
/**
 * Đầu thẻ trung chuyển thật: `paddingVertical` 14 + dòng ngày 14.5 đậm cao
 * ~17.3 (iOS) = 45.3. Ở đây khối cao nhất là ô mũi tên 16, cộng viền mảnh ~0.7,
 * nên mỗi bên 14.3 mới bằng — để 14 như cũ thì mỗi thẻ hụt ~3pt, mười thẻ lệch
 * hẳn một thẻ.
 */
const COMPACT_PADDING_V = 14.3;
/** Ô ảnh / QR ở cột phải của `ListCardAsset` (`MEDIA_SIZE`). */
const MEDIA_SIZE = 72;
/** Nhãn dưới ô ảnh: `marginTop` 4 + một dòng chữ 12. */
const MEDIA_LABEL_HEIGHT = 4 + 16;
const MEDIA_GAP = 10;

const getMediaColumnHeight = (media: number) =>
  media * (MEDIA_SIZE + MEDIA_LABEL_HEIGHT) + Math.max(0, media - 1) * MEDIA_GAP;

/**
 * Chiều cao riêng cụm vạch chữ, KHÔNG gồm padding của thẻ. Có `lineHeight` thì
 * mỗi vạch chiếm đúng một ô cao chừng đó — xem prop cùng tên ở dưới.
 */
const getLinesHeight = (lines: number, lineHeight?: number) =>
  lineHeight
    ? lines * lineHeight
    : LINE_TITLE_HEIGHT + Math.max(0, lines - 1) * (LINE_BAR_HEIGHT + LINE_GAP);

/**
 * Chiều cao một thẻ **kể cả khoảng cách xuống thẻ dưới**, để bên ngoài đếm được
 * số thẻ vừa phủ kín khung.
 *
 * Mọi dáng đều tính từ đúng cụm vạch đang vẽ. Trước đây `avatar` / `row` ước
 * lượng 21pt mỗi dòng trong khi vạch thật chỉ cách 19 — thẻ nhiều dòng bị đếm
 * cao hơn thật, dựng thiếu thẻ và hở một khoảng nền ở đáy màn.
 */
export const getRecordCardHeight = (
  variant: RecordCardVariant,
  lines: number,
  media = 0,
  lineHeight?: number,
) => {
  const linesHeight = getLinesHeight(lines, lineHeight);

  if (variant === "compact")
    return (
      Math.max(COMPACT_LEAD_SIZE, linesHeight) + COMPACT_PADDING_V * 2 + 12
    );
  // Không có lề ngoài; 8 là `gap` của danh sách chứa nó (picker Nội địa).
  if (variant === "row") return Math.max(18, linesHeight) + 12 * 2 + 8;
  // `plain` không có lề ngoài nên chiều cao thẻ cũng chính là bước lặp.
  if (variant === "plain") return Math.max(52, 10 * 2 + linesHeight);

  // Có cột ảnh thì thẻ cao theo cột nào dài hơn, avatar không còn nữa.
  if (media > 0)
    return (
      Math.max(linesHeight, getMediaColumnHeight(media)) + AVATAR_CARD_PADDING
    );

  return Math.max(48, linesHeight) + AVATAR_CARD_PADDING;
};

/**
 * Khung xám hình dáng một thẻ bản ghi.
 *
 * Khác `MenuCardSkeleton` (thẻ menu 58pt, một dòng nhãn + chevron): thẻ bản ghi
 * cao 90–150pt, có avatar tròn 48 và nhiều dòng field, nên không dùng lại được —
 * đem khung thẻ menu vào danh sách bản ghi thì lúc dữ liệu về sẽ nhảy layout.
 *
 * `lines` là số dòng field. Ba màn dùng `ListCardAsset` (`AssetList`,
 * `AssetRelatedList`, `QrReview`) lấy `lines` / `media` từ `getListCardShape`:
 * chỉ có sau `getFieldActive`, nên lần đầu mở một class trong phiên vẫn là dáng
 * ĐOÁN (avatar + 3 dòng) cho tới khi field về. Các màn còn lại truyền đúng số
 * dòng hard-code của mình.
 */
export default function RecordCardSkeleton({
  variant = "avatar",
  lines = 3,
  media = 0,
  lineHeight,
  avatarAlign = "center",
  trailing = "none",
  separator = false,
  opacity,
  style,
}: {
  variant?: RecordCardVariant;
  lines?: number;
  /**
   * Số ô ảnh / QR ở cột phải — chỉ dáng `avatar`. Có ô nào thì bỏ avatar, giống
   * `ListCardAsset` khi class có field ảnh (vd danh sách nhân viên).
   */
  media?: number;
  /**
   * Chiều cao MỘT dòng chữ của thẻ thật, tính cả margin / padding quanh dòng đó
   * (vd `ListCardHistory`: `paddingTop` 5 + chữ 14 cao ~16.7 + `marginBottom` 4).
   * Có thì mỗi vạch nằm giữa một ô cao đúng chừng đó, cụm vạch cao
   * `lines × lineHeight` như thẻ thật. Bỏ trống thì giữ nhịp mặc định (vạch
   * cách nhau 7) — vừa với thẻ chữ 13–14 không margin, nhưng thẻ thưa dòng hơn
   * sẽ thấp hơn thật vài pt mỗi thẻ, cộng dồn cả màn.
   */
  lineHeight?: number;
  /**
   * Chỗ avatar khi cụm vạch cao hơn nó. `center` (mặc định) như thẻ có
   * `alignItems: "center"` (vd `KeHoachCard`); `top` như thẻ để mặc định
   * `stretch` — `ListCardAsset`, `ListCardHistory`, thẻ Nội địa — nơi avatar
   * đứng ở đỉnh, vẽ giữa thì thẻ 4–5 dòng nhảy avatar lên 10–25pt lúc dữ liệu về.
   */
  avatarAlign?: "center" | "top";
  trailing?: RecordCardTrailing;
  /**
   * Gạch ngăn phía trên. Chỉ dáng `plain` dùng — và dòng đầu KHÔNG có, giống
   * `isFirst` của danh sách thật.
   */
  separator?: boolean;
  /** Nhịp nhấp nháy do danh sách cấp, để mọi thẻ sáng tối cùng nhau. */
  opacity: Animated.AnimatedInterpolation<number>;
  /** Chỉnh lề ngoài cho khớp danh sách chứa nó (vd danh sách đã có lề ngang). */
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hasMedia = variant === "avatar" && media > 0;

  return (
    <Animated.View
      style={[
        styles.card,
        hasMedia && styles.cardMedia,
        variant === "compact" && styles.cardCompact,
        variant === "row" && styles.cardRow,
        variant === "plain" && styles.cardPlain,
        separator && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.hairline,
        },
        { borderColor: colors.hairline, opacity },
        style,
      ]}
    >
      {variant === "avatar" && !hasMedia ? (
        <View
          style={[styles.avatar, avatarAlign === "top" && styles.avatarTop]}
        />
      ) : null}
      {variant === "compact" ? <View style={styles.compactLead} /> : null}

      <View style={[styles.lines, lineHeight ? styles.linesSlotted : null]}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.line,
              // Dòng đầu là nhãn chính nên đậm và dài hơn; các dòng sau dài ngắn
              // khác nhau cho giống bản ghi thật.
              index === 0 && styles.lineTitle,
              index % 3 === 2 && styles.lineShort,
              // Vạch nằm giữa ô của dòng chữ thật, như chữ nằm giữa dòng.
              lineHeight
                ? {
                    marginVertical:
                      (lineHeight -
                        (index === 0 ? LINE_TITLE_HEIGHT : LINE_BAR_HEIGHT)) /
                      2,
                  }
                : null,
            ]}
          />
        ))}
      </View>

      {hasMedia ? (
        <View style={styles.media}>
          {Array.from({ length: media }).map((_, index) => (
            <View key={index} style={styles.mediaItem}>
              <View style={styles.mediaThumb} />
              <View style={styles.mediaLabel} />
            </View>
          ))}
        </View>
      ) : null}

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
    // Chữ bám đỉnh thẻ cạnh cột ảnh, cách cột 12 như `ListCardAsset`.
    cardMedia: {
      alignItems: "flex-start",
      gap: 12,
    },
    // `gap` 10 giữa mũi tên và ngày như `cardHead` của lịch sử trung chuyển.
    cardCompact: {
      gap: 10,
      paddingVertical: COMPACT_PADDING_V,
    },
    // Đo từ `row` của `NoiDiaPickerList` (padding 12/14, bo 12).
    cardRow: {
      gap: 12,
      marginHorizontal: 0,
      marginVertical: 0,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
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
    avatarTop: {
      alignSelf: "flex-start",
    },
    compactLead: {
      width: COMPACT_LEAD_SIZE,
      height: COMPACT_LEAD_SIZE,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    lines: {
      flex: 1,
      gap: LINE_GAP,
    },
    // Khoảng cách đã nằm trong ô của từng vạch (`lineHeight`), cộng `gap` là thừa.
    linesSlotted: {
      gap: 0,
    },
    line: {
      width: "72%",
      height: LINE_BAR_HEIGHT,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    lineTitle: {
      width: "52%",
      height: LINE_TITLE_HEIGHT,
    },
    lineShort: {
      width: "38%",
    },
    media: {
      width: MEDIA_SIZE,
      gap: MEDIA_GAP,
    },
    mediaItem: {
      alignItems: "center",
    },
    mediaThumb: {
      width: MEDIA_SIZE,
      height: MEDIA_SIZE,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    mediaLabel: {
      width: 44,
      height: 10,
      marginTop: 4 + 3,
      marginBottom: 3,
      borderRadius: 5,
      backgroundColor: c.skeleton,
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
