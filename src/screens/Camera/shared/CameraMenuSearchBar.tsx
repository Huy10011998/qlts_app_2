import {
  AppColors,
  useAccentBorderColors,
  useStyles,
} from "../../../utils/helpers/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SearchBar from "../../../components/ui/SearchBar";
import { CAMERA_MENU_BRAND_RED } from "./cameraMenuTheme";
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
  const accentBorders = useAccentBorderColors();

  return (
    <View style={styles.searchWrap}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder="Tìm kiếm camera..."
        isSearching={isSearching}
        spinnerColor={CAMERA_MENU_BRAND_RED}
        maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
      />

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
