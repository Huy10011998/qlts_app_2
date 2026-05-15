import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../../components/ui/IconLoading";
import {
  CAMERA_MENU_BG,
  CAMERA_MENU_BRAND_RED,
  CAMERA_MENU_CARD_SHADOW,
} from "./cameraMenuTheme";

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
          <Ionicons name="search-outline" size={16} color="#8A95A3" />
        </View>
        <TextInput
          placeholder="Tìm kiếm camera..."
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#B0B8C4"
          style={styles.searchInput}
          clearButtonMode="never"
          returnKeyType="search"
        />
        {isSearching ? (
          <View style={styles.spinnerWrapper}>
            <IsLoading size="small" color={CAMERA_MENU_BRAND_RED} />
          </View>
        ) : null}
        {!isSearching && value.length > 0 ? (
          <Pressable onPress={() => onChangeText("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color="#B0B8C4" />
          </Pressable>
        ) : null}
      </View>

      {showResultCount ? (
        <View style={styles.resultBadge}>
          <Text style={styles.resultText}>{resultCount} kết quả</Text>
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
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
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
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F1923",
    fontWeight: "400",
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
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  resultText: {
    fontSize: 11,
    fontWeight: "600",
    color: CAMERA_MENU_BRAND_RED,
  },
});
