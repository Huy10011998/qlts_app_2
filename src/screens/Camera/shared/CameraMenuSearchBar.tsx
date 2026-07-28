import {
  AppColors,
  useAccentBorderColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../../components/ui/IconLoading";
import { CAMERA_MENU_BRAND_RED, cameraMenuCardShadow } from "./cameraMenuTheme";
import { COMPACT_TEXT_MAX_SCALE } from "../../../utils/helpers/textScaling";

type CameraMenuSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  isSearching: boolean;
  resultCount: number;
  showResultCount: boolean;
};

export default function CameraMenuSearchBar({
  value,
  onChangeText,
  isSearching,
  resultCount,
  showResultCount,
}: CameraMenuSearchBarProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const accentBorders = useAccentBorderColors();

  return (
    <View style={styles.searchWrap}>
      <View style={[styles.searchBox, { borderColor: hairlineBorderColor }]}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color={c.textSub} />
        </View>
        <TextInput
          placeholder="Tìm kiếm camera..."
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={c.placeholder}
          style={styles.searchInput}
          clearButtonMode="never"
          returnKeyType="search"
          maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
        />
        {isSearching ? (
          <View style={styles.spinnerWrapper}>
            <IsLoading size="small" color={CAMERA_MENU_BRAND_RED} />
          </View>
        ) : null}
        {!isSearching && value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={16} color={c.placeholder} />
          </Pressable>
        ) : null}
      </View>

      {showResultCount ? (
        <View style={[styles.resultBadge, { borderColor: accentBorders.red }]}>
          <Text style={styles.resultText} allowFontScaling={false}>
            {resultCount} kết quả
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    searchWrap: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: c.bg,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...cameraMenuCardShadow(c),
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
      color: c.text,
      fontWeight: "400",
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    spinnerWrapper: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 6,
    },
    clearButton: {
      padding: 4,
      marginLeft: 4,
    },
    resultBadge: {
      alignSelf: "flex-start",
      marginTop: 8,
      backgroundColor: c.redSurface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: c.redBorder,
    },
    resultText: {
      fontSize: 11,
      fontWeight: "600",
      color: CAMERA_MENU_BRAND_RED,
    },
  });
