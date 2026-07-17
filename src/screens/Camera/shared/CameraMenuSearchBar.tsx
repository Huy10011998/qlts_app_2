import { C } from "../../../utils/helpers/colors";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../../components/ui/IconLoading";
import {
  CAMERA_MENU_BG,
  CAMERA_MENU_BRAND_RED,
  CAMERA_MENU_CARD_SHADOW,
} from "./cameraMenuTheme";
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
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color={C.textSub} />
        </View>
        <TextInput
          placeholder="Tìm kiếm camera..."
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={C.placeholder}
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
          <Pressable onPress={() => onChangeText("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color={C.placeholder} />
          </Pressable>
        ) : null}
      </View>

      {showResultCount ? (
        <View style={styles.resultBadge}>
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
    backgroundColor: CAMERA_MENU_BG,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...CAMERA_MENU_CARD_SHADOW,
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
    color: C.text,
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
    backgroundColor: C.redSurface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.redBorder,
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    color: CAMERA_MENU_BRAND_RED,
  },
});
