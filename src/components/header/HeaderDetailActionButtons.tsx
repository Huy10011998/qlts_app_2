import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import AssetFormHeaderSubmitButton from "../assets/shared/AssetFormHeaderSubmitButton";

export function HeaderMoreButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.moreButton}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Thao tác khác"
    >
      <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

type HeaderDetailActionsRightProps = {
  showEdit: boolean;
  onEditPress: () => void;
  showMenu: boolean;
  onMenuPress: () => void;
};

/**
 * Góc phải header màn chi tiết: nút Sửa (hành động dùng nhiều nhất, giữ đúng
 * một lần bấm) và nút ⋯ cho phần còn lại.
 *
 * Pill Sửa dùng lại `AssetFormHeaderSubmitButton` — cùng dáng với nút Lưu ở các
 * màn form, nên header của cả luồng xem/sửa trông như một.
 */
export default function HeaderDetailActionsRight({
  showEdit,
  onEditPress,
  showMenu,
  onMenuPress,
}: HeaderDetailActionsRightProps) {
  if (!showEdit && !showMenu) return null;

  return (
    <View style={styles.row}>
      {showEdit ? (
        <AssetFormHeaderSubmitButton
          iconName="create-outline"
          label="Sửa"
          onPress={onEditPress}
        />
      ) : null}
      {showMenu ? <HeaderMoreButton onPress={onMenuPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  moreButton: {
    paddingHorizontal: 6,
  },
});
