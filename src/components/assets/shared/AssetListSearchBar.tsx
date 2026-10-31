import {
  useAccentBorderColors,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from "../../ui/SearchBar";
import HeaderSearchReveal from "../../ui/HeaderSearchReveal";
import { BRAND_RED } from "./listTheme";
import { makeSharedAssetListStyles } from "./listStyles";

type AssetListSearchBarProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isSearching: boolean;
  onClear: () => void;
  badgeText: string;
  summaryText: string;
  /**
   * Có thì nhãn bên trái thành nút lọc (icon phễu) mở bảng chọn danh mục. Thiếu
   * thì nhãn chỉ để đọc như trước — màn không có cây danh mục không có gì để mở.
   */
  onBadgePress?: () => void;
  /** Có thì nhãn hiện thêm nút × để bỏ lọc. Chỉ truyền khi đang lọc. */
  onBadgeClear?: () => void;
  /**
   * Ô ẩn sau nút kính lúp trên header (`useHeaderSearch`). Đóng thì chỉ ẩn ô
   * nhập — dòng nhãn + số bản ghi (và nút lọc danh mục) vẫn ở đó.
   */
  search?: { open: boolean; close: () => void };
};

export default function AssetListSearchBar({
  placeholder,
  value,
  onChangeText,
  isSearching,
  onClear,
  badgeText,
  summaryText,
  onBadgePress,
  onBadgeClear,
  search,
}: AssetListSearchBarProps) {
  const styles = useStyles(makeSharedAssetListStyles);
  const accentBorders = useAccentBorderColors();
  const showInput = search?.open ?? true;

  return (
    <View style={styles.searchWrap}>
      {/* Khoảng 8 giữa ô và dòng nhãn là `gap` của khung trượt: đóng ô thì
          thu về 0 cùng ô, dòng nhãn lên sát đỉnh khối. */}
      <HeaderSearchReveal open={showInput} gap={8}>
        <SearchBar
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onClear={onClear}
          isSearching={isSearching}
          spinnerColor={BRAND_RED}
          autoFocus={Boolean(search)}
          onClose={search?.close}
        />
      </HeaderSearchReveal>

      <View style={[styles.summaryRow, localStyles.flush]}>
        {onBadgePress ? (
          <View
            style={[
              styles.summaryBadge,
              styles.summaryChip,
              { borderColor: accentBorders.red },
            ]}
          >
            <TouchableOpacity
              style={styles.summaryChipMain}
              onPress={onBadgePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Lọc theo danh mục: ${badgeText}`}
            >
              <Ionicons name="funnel-outline" size={12} color={BRAND_RED} />
              <Text
                style={[styles.summaryBadgeText, styles.summaryChipText]}
                numberOfLines={1}
              >
                {badgeText}
              </Text>
            </TouchableOpacity>
            {onBadgeClear ? (
              <TouchableOpacity
                onPress={onBadgeClear}
                hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Bỏ lọc danh mục"
              >
                <Ionicons name="close" size={14} color={BRAND_RED} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View
            style={[styles.summaryBadge, { borderColor: accentBorders.red }]}
          >
            <Text style={styles.summaryBadgeText} numberOfLines={1}>
              {badgeText}
            </Text>
          </View>
        )}
        <Text
          style={styles.summaryMeta}
          numberOfLines={1}
        >
          {summaryText}
        </Text>
      </View>
    </View>
  );
}

// Khoảng trên dòng nhãn đã nằm trong khung trượt của ô nhập.
const localStyles = StyleSheet.create({
  flush: { marginTop: 0 },
});
