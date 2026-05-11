import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../ui/IconLoading";
import { BRAND_RED } from "./listTheme";
import { sharedAssetListStyles as styles } from "./listStyles";

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
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color="#8A95A3" />
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#B0B8C4"
          value={value}
          onChangeText={onChangeText}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {isSearching && (
          <View style={styles.spinnerWrap}>
            <IsLoading size="small" color={BRAND_RED} />
          </View>
        )}
        {!isSearching && value.length > 0 && (
          <Pressable onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color="#B0B8C4" />
          </Pressable>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>{badgeText}</Text>
        </View>
        <Text style={styles.summaryMeta}>{summaryText}</Text>
      </View>
    </View>
  );
}
