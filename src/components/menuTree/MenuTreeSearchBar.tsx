import {
  C,
  useAccentBorderColors,
  useAppColors,
} from "../../utils/helpers/colors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from "../ui/SearchBar";
import { COMPACT_TEXT_MAX_SCALE } from "../../utils/helpers/textScaling";

type MenuTreeSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  isSearching: boolean;
  resultCount: number;
  showResultCount: boolean;
  placeholder?: string;
  /** Bỏ trống khi không còn nhóm nào đang mở — lúc đó nút không có việc gì làm. */
  onCollapseAll?: () => void;
};

export default function MenuTreeSearchBar({
  value,
  onChangeText,
  isSearching,
  resultCount,
  showResultCount,
  placeholder = "Tìm kiếm...",
  onCollapseAll,
}: MenuTreeSearchBarProps) {
  const accentBorders = useAccentBorderColors();
  const colors = useAppColors();

  return (
    <View style={[styles.searchWrap, { backgroundColor: colors.bg }]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        isSearching={isSearching}
        spinnerColor={C.red}
        maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
      />

      {showResultCount || onCollapseAll ? (
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
    paddingBottom: 8,
  },
  metaRow: {
    marginTop: 8,
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
