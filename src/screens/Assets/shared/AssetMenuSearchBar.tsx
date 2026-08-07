import {
  useAccentBorderColors,
  useAppColors,
} from "../../../utils/helpers/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SearchBar from "../../../components/ui/SearchBar";
import { ASSET_MENU_BRAND_RED } from "./assetMenuTheme";
import { COMPACT_TEXT_MAX_SCALE } from "../../../utils/helpers/textScaling";

type AssetMenuSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  isSearching: boolean;
  resultCount: number;
  showResultCount: boolean;
  placeholder?: string;
};

export default function AssetMenuSearchBar({
  value,
  onChangeText,
  isSearching,
  resultCount,
  showResultCount,
  placeholder = "Tìm kiếm tài sản...",
}: AssetMenuSearchBarProps) {
  const accentBorders = useAccentBorderColors();
  const colors = useAppColors();

  return (
    <View style={[styles.searchWrap, { backgroundColor: colors.bg }]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        isSearching={isSearching}
        spinnerColor={ASSET_MENU_BRAND_RED}
        maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
      />

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
          <Text style={styles.resultText} allowFontScaling={false}>
            {resultCount} kết quả
          </Text>
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
  resultBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    color: ASSET_MENU_BRAND_RED,
  },
});
