import {
  useAccentBorderColors,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { Text, View } from "react-native";
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
};

export default function AssetListSearchBar({
  placeholder,
  value,
  onChangeText,
  isSearching,
  onClear,
  badgeText,
  summaryText,
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
        <View style={[styles.summaryBadge, { borderColor: accentBorders.red }]}>
          <Text
            style={styles.summaryBadgeText}
            numberOfLines={1}
          >
            {badgeText}
          </Text>
        </View>
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
