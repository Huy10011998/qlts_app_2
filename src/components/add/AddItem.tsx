import React, { memo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";

import type { AssetAddItemNavigationProp } from "../../types/navigator.d";
import type { AddItemAssetProps } from "../../types/components.d";
import AddActionFab from "./shared/AddActionFab";
import { REVIEW_NAME_CLASSES_DANHGIA } from "../../constants/reviewNameClasses";

function AddItemComponent({
  onPress,
  nameClass,
  field,
  propertyClass,
  titleHeader,
  groupMenuId,
  viewPermission,
  assetTitleHeader,
}: AddItemAssetProps) {
  const navigation = useNavigation<AssetAddItemNavigationProp>();

  const handlePress = useCallback(() => {
    if (typeof onPress === "function") {
      onPress();
      return;
    }

    if (typeof onPress === "string") {
      navigation.navigate(onPress as never);
      return;
    }

    navigation.navigate("AssetAddItem", {
      field: JSON.stringify(field),
      nameClass,
      propertyClass,
      titleHeader,
      groupMenuId,
      viewPermission,
      assetTitleHeader,
    });
  }, [
    onPress,
    navigation,
    field,
    nameClass,
    propertyClass,
    titleHeader,
    groupMenuId,
    viewPermission,
    assetTitleHeader,
  ]);

  const normalizedNameClass = (nameClass || "").trim();
  const label = REVIEW_NAME_CLASSES_DANHGIA.includes(normalizedNameClass)
    ? "Đánh giá"
    : "Thêm mới";

  return (
    <AddActionFab label={label} onPress={handlePress} variant="extended" />
  );
}

export const AddItem = memo(AddItemComponent);
