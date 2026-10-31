import React from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ADD_FAB_OFFSET, ADD_FAB_SIZE } from "../add/shared/AddActionFab";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../ui/useSkeletonAutoFill";
import RecordCardSkeleton, {
  getRecordCardHeight,
  type RecordCardTrailing,
  type RecordCardVariant,
} from "./RecordCardSkeleton";

/**
 * Khung chờ đầy đủ của một màn danh sách bản ghi: phần header cố định + số thẻ
 * vừa đủ phủ kín màn.
 *
 * Trước đây 8 màn danh sách đều `IsLoading` giữa màn trắng, và cái đó **xoá mất
 * cả header** — ô tìm kiếm, thẻ tổng số, banner — dù chúng có kích thước cố định
 * biết trước trong `listStyles.ts`. Nên dựng lại đúng chỗ của chúng: lúc dữ liệu
 * về, header thật thay vào đúng vị trí, danh sách không nhảy xuống.
 *
 * Mỗi màn khai phần header mình có thay vì tự vẽ, để 8 màn chờ giống nhau.
 *
 * CHỈ vẽ khi màn chưa có gì để vẽ — dùng `shouldShowListSkeleton` để quyết định.
 */
/**
 * Tách riêng để `useSafeAreaInsets` CHỈ chạy khi màn thật sự có nút.
 *
 * Gọi thẳng trong `RecordListSkeleton` thì mọi màn danh sách — kể cả màn không
 * có nút nào — đều bắt buộc phải nằm dưới một `SafeAreaProvider`, tức là thêm
 * một ràng buộc cho tất cả chỉ vì một tính năng mặc định tắt.
 */
function SkeletonFab({
  opacity,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    /* Vỏ nút giữ nguyên màu đỏ thật, chỉ ruột (icon + nhãn) mới tô mờ — cùng lối
       với ô tìm kiếm ở trên: vẽ cả nút thành khối xám rồi đổi sang đỏ là một
       nhịp nhảy màu ngay góc màn. */
    <Animated.View
      style={[styles.fab, { bottom: insets.bottom + ADD_FAB_OFFSET, opacity }]}
    >
      <View style={styles.fabIcon} />
      <View style={styles.fabLabel} />
    </Animated.View>
  );
}

export default function RecordListSkeleton({
  hasSearchBar = false,
  hasSearchInput = true,
  searchSummary = "badge",
  hasSummaryCard = false,
  hasBanner = false,
  hasFilterCard = false,
  hasGroupHeader = false,
  hasFab = false,
  variant = "avatar",
  lines = 3,
  media = 0,
  lineHeight,
  avatarAlign,
  trailing = "none",
  rows,
  contentStyle,
}: {
  hasSearchBar?: boolean;
  /**
   * Ô nhập của khối tìm kiếm. False khi ô đang ẩn sau nút kính lúp trên header
   * (`useHeaderSearch`): chỉ còn dòng tóm tắt, như màn thật.
   */
  hasSearchInput?: boolean;
  /**
   * Dòng tóm tắt dưới ô tìm kiếm — mỗi kiểu ứng với một khối tìm kiếm thật:
   *
   * - `badge` (mặc định): `AssetListSearchBar` — nhãn viền đỏ bên trái + số
   *   đếm bên phải; khối có lề ngang 14 và tự chừa 14 phía trên.
   * - `count`: `SearchBar` trần + một dòng chữ nhỏ "N kết quả" bên trái, như
   *   `NoiDiaPickerList`; lề ngang 16 và KHÔNG tự chừa khoảng trên — khoảng đó
   *   là `paddingTop` khung ngoài của màn, nằm trên cả dòng ngữ cảnh.
   */
  searchSummary?: "badge" | "count";
  /**
   * Thẻ tổng số của `AssetListSummaryCard`, kể cả lề 2 / 10 của `stickyHeader`
   * bọc nó.
   */
  hasSummaryCard?: boolean;
  /** Dải nhắc vuốt của `AssetList`, chỉ hiện khi class có cây con. */
  hasBanner?: boolean;
  /**
   * Thẻ mở bộ lọc ngày, ghim trên đầu danh sách lịch sử xác nhận vị trí tủ.
   * Cùng hình dáng thẻ tổng số nhưng có mũi tên xổ ở cuối và lề riêng của
   * `stickyHeader` — xem `listStyles.ts`.
   */
  hasFilterCard?: boolean;
  /**
   * Gom thẻ theo nhóm như tab Tệp (gom theo loại tệp): các thẻ nằm TRONG một
   * khối trắng bo góc, dòng tiêu đề nhóm ở đầu khối — đo từ `groupContainer` /
   * `categoryText` của `AssetAttachFile`. Vẽ tiêu đề trần trên nền trang như
   * trước thì lúc dữ liệu về hiện ra cả một tấm nền trắng, thẻ thụt vào 12 mỗi
   * bên. Chỉ dựng MỘT nhóm: số nhóm chỉ biết sau khi có dữ liệu, nên đây là
   * phần xấp xỉ duy nhất của khung chờ này.
   */
  hasGroupHeader?: boolean;
  /**
   * Nút nổi thêm mới ở góc dưới phải.
   *
   * Nơi gọi phải tự hỏi quyền `Insert` rồi truyền vào, ĐỪNG mặc định bật: tài
   * khoản không có quyền thêm mà vẫn vẽ thì nút đỏ nhá lên một nhịp rồi biến
   * mất — tệ hơn là không vẽ. Chưa đọc xong quyền cũng truyền `false`.
   */
  hasFab?: boolean;
  variant?: RecordCardVariant;
  lines?: number;
  /** Số ô ảnh / QR ở cột phải thẻ — xem `RecordCardSkeleton`. */
  media?: number;
  /** Chiều cao một dòng chữ của thẻ thật — xem `RecordCardSkeleton`. */
  lineHeight?: number;
  /** Avatar đứng giữa hay ở đỉnh thẻ — xem `RecordCardSkeleton`. */
  avatarAlign?: "center" | "top";
  trailing?: RecordCardTrailing;
  /**
   * Số thẻ cố định, cho chỗ KHÔNG đo được chiều cao khung: bên trong `ScrollView`
   * hoặc bottom sheet, chiều cao khung lại do chính nội dung quyết định nên phép
   * tự đếm sẽ chạy vòng. Bỏ trống thì tự phủ kín màn.
   */
  rows?: number;
  /**
   * Lề của khối thẻ (nằm dưới mọi khối header ở trên). Truyền thẳng
   * `contentContainerStyle` của danh sách thật để hai bên không lệch nhau khi
   * một bên đổi: `paddingTop` 14 của lịch sử, `padding` 16 + `gap` 8 của picker
   * Nội địa (dáng `row` không tự có lề). Bỏ trống thì thẻ bắt đầu sát header.
   */
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(
    getRecordCardHeight(variant, lines, media, lineHeight),
    rows,
  );

  const cards = Array.from({ length: rowCount }).map((_, index) => (
    <RecordCardSkeleton
      key={index}
      variant={variant}
      lines={lines}
      media={media}
      lineHeight={lineHeight}
      avatarAlign={avatarAlign}
      trailing={trailing}
      // Dòng đầu không có gạch ngăn, giống `isFirst` của danh sách thật.
      separator={variant === "plain" && index > 0}
      opacity={opacity}
    />
  ));

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      accessibilityLabel="Đang tải danh sách"
    >
      {hasSearchBar ? (
        <View
          style={
            searchSummary === "count" ? styles.searchWrapCount : styles.searchWrap
          }
        >
          {/* Ô tìm kiếm thật là hộp TRẮNG có viền (`SearchBar` cardBox), chỉ chữ
              bên trong mới xám — vẽ thành khối xám đặc là lệch hình dáng. */}
          {hasSearchInput ? (
            <Animated.View
              style={[styles.searchBar, { borderColor: colors.border, opacity }]}
            >
              <View style={styles.searchIcon} />
              <View style={styles.searchText} />
            </Animated.View>
          ) : null}
          {searchSummary === "count" ? (
            <Animated.View
              style={[
                styles.countLabel,
                hasSearchInput ? null : styles.countLabelNoInput,
                { backgroundColor: colors.skeleton, opacity },
              ]}
            />
          ) : (
            <View
              style={[styles.summaryRow, hasSearchInput ? null : styles.summaryRowNoInput]}
            >
              <Animated.View
                style={[
                  styles.summaryBadge,
                  { backgroundColor: colors.skeleton, opacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.summaryMeta,
                  { backgroundColor: colors.skeleton, opacity },
                ]}
              />
            </View>
          )}
        </View>
      ) : null}

      {hasSummaryCard ? (
        <Animated.View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity },
          ]}
        >
          <View style={styles.summaryCardIcon} />
          <View style={styles.summaryCardLines}>
            <View style={styles.summaryCardTitle} />
            <View style={styles.summaryCardSub} />
          </View>
        </Animated.View>
      ) : null}

      {hasBanner ? (
        <Animated.View
          style={[
            styles.banner,
            { backgroundColor: colors.skeleton, opacity },
          ]}
        />
      ) : null}

      {hasFilterCard ? (
        <Animated.View
          style={[
            styles.filterCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity },
          ]}
        >
          <View style={styles.summaryCardIcon} />
          <View style={styles.summaryCardLines}>
            <View style={styles.summaryCardTitle} />
            <View style={styles.summaryCardSub} />
          </View>
          <View style={styles.filterCardChevron} />
        </Animated.View>
      ) : null}

      {hasFab ? <SkeletonFab opacity={opacity} /> : null}

      <View style={contentStyle}>
        {hasGroupHeader ? (
          /* Vỏ nhóm là tấm trắng thật nên KHÔNG nhấp nháy, chỉ tiêu đề và thẻ
             bên trong mới mờ — tô mờ cả vỏ thì thẻ con mờ chồng hai lần. */
          <View
            style={[
              styles.group,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.groupTitleRow, { borderBottomColor: colors.hairline }]}
            >
              <Animated.View
                style={[
                  styles.groupTitle,
                  { backgroundColor: colors.skeleton, opacity },
                ]}
              />
            </View>
            {cards}
          </View>
        ) : (
          cards
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    searchWrap: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    // `searchBar` (lề 16) của `NoiDiaPickerList` — ô đó không có padding trên.
    searchWrapCount: {
      paddingHorizontal: 16,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    searchIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.skeleton,
    },
    searchText: {
      width: "56%",
      height: 12,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 12,
    },
    summaryRowNoInput: {
      marginTop: 0,
    },
    summaryBadge: {
      width: 108,
      height: 22,
      borderRadius: 8,
    },
    summaryMeta: {
      width: 76,
      height: 12,
      borderRadius: 6,
    },
    /* "N kết quả" của picker Nội địa: `paddingTop` 8 + chữ 12 cao ~14.3 (iOS).
       Vạch 10 cộng 2 mỗi bên cho bằng dòng chữ đó. */
    countLabel: {
      width: 70,
      height: 10,
      marginTop: 8 + 2,
      marginBottom: 2,
      borderRadius: 5,
    },
    // Ô nhập đang ẩn (`hasSearchInput` false): dòng đếm ở đỉnh khối, 2 vẫn để
    // căn giữa với dòng chữ thật.
    countLabelNoInput: {
      marginTop: 2,
    },
    // Lề 2 / 10 là `stickyHeader` bọc `AssetListSummaryCard` — trước đây 0 / 6
    // nên lúc dữ liệu về danh sách tụt xuống 6pt.
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 14,
      marginTop: 2,
      marginBottom: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    filterCard: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 14,
      marginTop: 2,
      marginBottom: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    filterCardChevron: {
      width: 16,
      height: 16,
      marginLeft: 8,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    summaryCardIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      marginRight: 10,
      backgroundColor: c.skeleton,
    },
    summaryCardLines: {
      flex: 1,
      gap: 6,
    },
    summaryCardTitle: {
      width: "56%",
      height: 13,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryCardSub: {
      width: "34%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    /* Đo từ `groupContainer` của `AssetAttachFile`: lề ngang 12, trên 4, đệm
       dưới 8, bo 12. Thẻ bên trong giữ lề 12 của chính nó, nên thụt vào x = 24
       như `ListCardAttachFile` thật. */
    group: {
      marginHorizontal: 12,
      marginTop: 4,
      paddingBottom: 8,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    /* `categoryText`: đệm 8/12 + chữ 14 đậm cao ~17 (iOS) + gạch dưới mảnh ≈ 33.
       Vạch 14 cộng 1.5 mỗi bên cho bằng dòng chữ. */
    groupTitleRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    groupTitle: {
      width: 72,
      height: 14,
      marginVertical: 1.5,
      borderRadius: 6,
    },
    // Đo từ `AddActionFab` dáng `extended` — dáng duy nhất các màn danh sách dùng.
    fab: {
      position: "absolute",
      right: ADD_FAB_OFFSET,
      zIndex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 148,
      height: ADD_FAB_SIZE,
      paddingHorizontal: 18,
      borderRadius: ADD_FAB_SIZE / 2,
      backgroundColor: c.red,
    },
    fabIcon: {
      width: 34,
      height: 34,
      marginRight: 10,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    fabLabel: {
      width: 74,
      height: 14,
      borderRadius: 6,
      backgroundColor: "rgba(255,255,255,0.45)",
    },
    banner: {
      height: 38,
      marginHorizontal: 14,
      marginBottom: 6,
      borderRadius: 12,
    },
  });
