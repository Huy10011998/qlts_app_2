import {
  useAccentBorderColors,
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../../components/ui/IconLoading";
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
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();
  const colors = useAppColors();

  return (
    <View style={[styles.searchWrap, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor: hairlineBorderColor,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textSub} />
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          style={[styles.searchInput, { color: colors.text }]}
          clearButtonMode="never"
          returnKeyType="search"
          maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
        />
        {isSearching ? (
          <View style={styles.spinnerWrap}>
            <IsLoading size="small" color={ASSET_MENU_BRAND_RED} />
          </View>
        ) : null}
        {!isSearching && value.length > 0 ? (
          <Pressable onPress={() => onChangeText("")} style={styles.clearBtn}>
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.placeholder}
            />
          </Pressable>
        ) : null}
      </View>

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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIconWrap: {
    marginRight: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
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
