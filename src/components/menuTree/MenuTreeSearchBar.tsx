import {
  C,
  useAccentBorderColors,
  useAppColors,
} from "../../utils/helpers/colors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from "../ui/SearchBar";
import HeaderSearchReveal from "../ui/HeaderSearchReveal";

type MenuTreeSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  isSearching: boolean;
  resultCount: number;
  showResultCount: boolean;
  placeholder?: string;
  /** Bỏ trống khi không còn nhóm nào đang mở — lúc đó nút không có việc gì làm. */
  onCollapseAll?: () => void;
  /**
   * Ô ẩn sau nút kính lúp trên header (`useHeaderSearch`). Đóng thì chỉ ẩn ô
   * nhập; nút "Thu tất cả" vẫn ở đó nếu có.
   */
  search?: { open: boolean; close: () => void };
};

export default function MenuTreeSearchBar({
  value,
  onChangeText,
  isSearching,
  resultCount,
  showResultCount,
  placeholder = "Tìm kiếm...",
  onCollapseAll,
  search,
}: MenuTreeSearchBarProps) {
  const accentBorders = useAccentBorderColors();
  const colors = useAppColors();
  const showInput = search?.open ?? true;
  const showMeta = showResultCount || Boolean(onCollapseAll);

  // Khoảng 14 trên luôn giữ: hàng Truy cập nhanh và danh sách bên dưới không có
  // lề trên riêng (vốn dựa vào khối này), bỏ hẳn thì chúng dính sát header.
  // Khoảng 8 dưới ô nhập là `gap` của khung trượt, thu về 0 cùng ô; khoảng 8
  // dưới hàng đếm đi theo hàng đó. Ô ẩn, không có hàng nào: chỉ còn 14 trên.
  return (
    <View style={[styles.searchWrap, { backgroundColor: colors.bg }]}>
      <HeaderSearchReveal open={showInput} gap={8}>
        <SearchBar
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          isSearching={isSearching}
          spinnerColor={C.red}
          autoFocus={Boolean(search)}
          onClose={search?.close}
        />
      </HeaderSearchReveal>

      {showMeta ? (
        <View style={styles.metaRow}>
          {showResultCount ? (
            <View
              style={[
                styles.resultBadge,
                {
                  backgroundColor: colors.redSurface,
                  borderColor: accentBorders.red,
                },
              ]}
            >
              <Text style={styles.resultText}>
                {resultCount} kết quả
              </Text>
            </View>
          ) : null}

          {onCollapseAll ? (
            <TouchableOpacity
              style={styles.collapseButton}
              onPress={onCollapseAll}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Thu tất cả nhóm"
            >
              <Ionicons
                name="contract-outline"
                size={13}
                color={C.red}
              />
              <Text style={styles.resultText}>
                Thu tất cả
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  metaRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  collapseButton: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  resultBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.red,
  },
});
