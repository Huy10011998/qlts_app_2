import React, { memo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";

import { AssetAddItemNavigationProp } from "../../types/Navigator.d";
import { AddItemAssetProps } from "../../types/Components.d";
import AddActionFab from "./shared/AddActionFab";

function AddItemComponent({
  onPress,
  nameClass,
  field,
  propertyClass,
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
    });
  }, [onPress, navigation, field, nameClass, propertyClass]);

  return <AddActionFab label="Thêm mới" onPress={handlePress} variant="extended" />;
}

export const AddItem = memo(AddItemComponent);
