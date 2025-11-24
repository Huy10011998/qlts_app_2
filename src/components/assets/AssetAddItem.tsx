import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AssetAddItemNavigationProp } from "../../types/Navigator.d";
import { AddItemAssetProps } from "../../types/Components.d";

export function AssetAddItem({
  onPress,
  nameClass,
  field,
  onCreated,
}: AddItemAssetProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AssetAddItemNavigationProp>();

  const handlePress = () => {
    if (typeof onPress === "function") {
      onPress();
    } else if (typeof onPress === "string") {
      navigation.navigate(onPress as never);
    } else {
      navigation.navigate("AssetAddItem", {
        field: JSON.stringify(field),
        nameClass: nameClass,
        onCreated: onCreated,
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: 24 + insets.bottom }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 24,
    backgroundColor: "#FF3333",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 6,
    marginBottom: 20,
  },
});
