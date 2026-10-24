import {
  useAccentBorderColors,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from "../../ui/SearchBar";
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
}: AssetListSearchBarProps) {
  const styles = useStyles(makeSharedAssetListStyles);
  const accentBorders = useAccentBorderColors();

  return (
    <View style={styles.searchWrap}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onClear={onClear}
        isSearching={isSearching}
        spinnerColor={BRAND_RED}
      />

      <View style={styles.summaryRow}>
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
