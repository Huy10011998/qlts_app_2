import {
  useAccentBorderColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../ui/IconLoading";
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
  const c = useAppColors();
  const styles = useStyles(makeSharedAssetListStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();

  return (
    <View style={styles.searchWrap}>
      <View style={[styles.searchBox, { borderColor: hairlineBorderColor }]}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color={c.textSub} />
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          value={value}
          onChangeText={onChangeText}
          style={styles.searchInput}
          clearButtonMode="never"
          returnKeyType="search"
        />
        {isSearching && (
          <View style={styles.spinnerWrap}>
            <IsLoading size="small" color={BRAND_RED} />
          </View>
        )}
        {!isSearching && value.length > 0 && (
          <Pressable onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color={c.placeholder} />
          </Pressable>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBadge, { borderColor: accentBorders.red }]}>
          <Text
            style={styles.summaryBadgeText}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {badgeText}
          </Text>
        </View>
        <Text
          style={styles.summaryMeta}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {summaryText}
        </Text>
      </View>
    </View>
  );
}
