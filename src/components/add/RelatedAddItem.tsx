import React, { memo, useCallback } from "react";
import { TouchableOpacity, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssetAddRelatedItemNavigationProp } from "../../types/Navigator.d";
import { RelatedAddItemAssetProps } from "../../types/Components.d";

const FAB_SIZE = 64;
const FAB_OFFSET = 16;

function RelatedAddItemComponent({
  onPress,
  nameClass,
  field,
  propertyClass,
  idRoot,
  nameClassRoot,
}: RelatedAddItemAssetProps) {
  const navigation = useNavigation<AssetAddRelatedItemNavigationProp>();
  const insets = useSafeAreaInsets();

  const handlePress = useCallback(() => {
    if (typeof onPress === "function") {
      onPress();
      return;
    }

    if (typeof onPress === "string") {
      navigation.navigate(onPress as never);
      return;
    }

    navigation.navigate("AssetAddRelatedItem", {
      field: JSON.stringify(field),
      nameClass,
      propertyClass,
      idRoot,
      nameClassRoot,
    });
  }, [onPress, navigation, field, nameClass, propertyClass, idRoot]);

  // FAB screen → chỉ neo theo safeArea
  // KHÔNG dính tabBar
  const bottom = insets.bottom + FAB_OFFSET;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Thêm mới"
      hitSlop={12}
      style={[styles.fab, { bottom }]}
    >
      <Ionicons name="add" size={34} color="#fff" />
    </TouchableOpacity>
  );
}

export const RelatedAddItem = memo(RelatedAddItemComponent);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: FAB_OFFSET,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#FF3333",
    alignItems: "center",
    justifyContent: "center",

    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 6,
        }
      : {
          elevation: 10,
        }),
  },
});
