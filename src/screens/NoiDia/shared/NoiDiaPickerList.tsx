import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SearchBar from "../../../components/ui/SearchBar";
import HeaderSearchReveal from "../../../components/ui/HeaderSearchReveal";
import { useHeaderSearch } from "../../../hooks/useHeaderSearch";
import { removeVietnameseTones } from "../../../utils/Helper";
import RecordListSkeleton from "../../../components/list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../../../components/ui/shouldShowListSkeleton";
import EmptyState from "../../../components/ui/EmptyState";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";

type PickerItem = {
  id: number;
  title: string;
  subtitle?: string;
};

type NoiDiaPickerListProps<T> = {
  items: T[];
  toPickerItem: (item: T) => PickerItem;
  onSelect: (item: T) => void;
  searchPlaceholder: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyTitle?: string;
  /** Dòng ngữ cảnh phía trên ô tìm kiếm (vd: NPP đã chọn ở bước trước). */
  contextLabel?: string;
};

/**
 * Nhịp dòng của khung chờ, đo từ `rowTitle` / `rowSubtitle` (cỡ chữ iOS): tên
 * 14.5 đậm cao ~17.3, dòng phụ `marginTop` 3 + chữ 12.5 cao ~14.9 → hai dòng
 * 35.2, cả dòng chọn ~60. Nhịp mặc định của khung chờ chỉ 33 nên mỗi dòng hụt
 * ~2.5pt, cuối màn lệch gần nửa dòng.
 */
const SKELETON_LINE_HEIGHT = (17.3 + 3 + 14.9) / 2;

/**
 * Danh sách chọn có ô tìm kiếm, dùng cho cả nhà phân phối và khách hàng.
 *
 * Cả hai API đều trả toàn bộ danh sách một lượt (NPP cỡ trăm dòng, khách hàng
 * có thể hơn 1.000) nên lọc tại chỗ và để FlatList ảo hoá phần hiển thị, thay
 * vì gọi lại API theo từ khoá.
 */
export default function NoiDiaPickerList<T>({
  items,
  toPickerItem,
  onSelect,
  searchPlaceholder,
  isLoading,
  errorMessage,
  emptyTitle = "Không có dữ liệu",
  contextLabel,
}: NoiDiaPickerListProps<T>) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [searchText, setSearchText] = useState("");
  const search = useHeaderSearch({
    query: searchText,
    onClear: () => setSearchText(""),
  });

  // Bỏ dấu sẵn một lần cho mỗi dòng: gõ "Minh Thien" phải ra "Minh Thiên A",
  // người dùng ngoài hiện trường hiếm khi gõ đủ dấu.
  const rows = useMemo(
    () =>
      items.map((item) => {
        const pickerItem = toPickerItem(item);

        return {
          source: item,
          ...pickerItem,
          searchKey: removeVietnameseTones(
            `${pickerItem.title} ${pickerItem.subtitle ?? ""}`,
          ),
        };
      }),
    [items, toPickerItem],
  );

  const filteredRows = useMemo(() => {
    const keyword = removeVietnameseTones(searchText.trim());
    if (!keyword) return rows;

    return rows.filter((row) => row.searchKey.includes(keyword));
  }, [rows, searchText]);

  if (
    shouldShowListSkeleton({
      isFetching: Boolean(isLoading),
      isEmpty: rows.length === 0,
    })
  )
    return (
      /* Dòng ngữ cảnh ("NPP: ...") là tham số route, có ngay từ frame đầu — dựng
         chữ THẬT chứ không tô xám, và không có nó thì lúc dữ liệu về cả danh
         sách bị đẩy xuống một dòng.

         Dùng chung `root` (có `paddingTop` 12) với màn thật: khoảng hở trên nằm
         TRÊN dòng ngữ cảnh, nên không thể để khối tìm kiếm của khung chờ tự chừa
         thay — làm vậy thì dòng ngữ cảnh dính sát đỉnh, cao hơn thật 12pt. Kiểu
         `count` là ô tìm kiếm không chừa khoảng trên, cộng dòng "N kết quả". */
      <View style={styles.root}>
        {contextLabel ? (
          <Text style={styles.contextLabel} numberOfLines={1}>
            {contextLabel}
          </Text>
        ) : null}

        <RecordListSkeleton
          hasSearchBar
          hasSearchInput={search.open}
          searchSummary="count"
          variant="row"
          lines={2}
          lineHeight={SKELETON_LINE_HEIGHT}
          trailing="chevron"
          contentStyle={styles.listContent}
        />
      </View>
    );

  return (
    <View style={styles.root}>
      {contextLabel ? (
        <Text style={styles.contextLabel} numberOfLines={1}>
          {contextLabel}
        </Text>
      ) : null}

      <HeaderSearchReveal open={search.open} gap={8}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder={searchPlaceholder}
          style={styles.searchBar}
          autoFocus
          onClose={search.close}
        />
      </HeaderSearchReveal>

      <Text
        style={styles.countLabel}
      >
        {filteredRows.length} kết quả
      </Text>

      <FlatList
        data={filteredRows}
        keyExtractor={(row) => String(row.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        windowSize={11}
        ListEmptyComponent={
          <View style={styles.emptyRoot}>
            <EmptyState
              iconName={
                errorMessage ? "cloud-offline-outline" : "search-outline"
              }
              title={errorMessage ? "Không tải được dữ liệu" : emptyTitle}
              subtitle={errorMessage ?? undefined}
            />
          </View>
        }
        renderItem={({ item: row }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onSelect(row.source)}
          >
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {row.title}
              </Text>
              {row.subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={2}>
                  {row.subtitle}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: 12,
    },
    contextLabel: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    searchBar: {
      marginHorizontal: 16,
    },
    // Sát ngay dưới ô tìm: khoảng hở 8 là `gap` của khung trượt, đóng ô thì
    // thu về 0 cùng ô.
    countLabel: {
      paddingHorizontal: 16,
      fontSize: 12,
      color: c.textSub,
    },
    listContent: {
      padding: 16,
      gap: 8,
      flexGrow: 1,
    },
    emptyRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14.5,
      fontWeight: "600",
      color: c.text,
    },
    rowSubtitle: {
      marginTop: 3,
      fontSize: 12.5,
      color: c.textSub,
    },
  });
