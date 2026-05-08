import React from "react";
import { StyleSheet, View } from "react-native";
import AssetAddItemDetails from "../../components/assets/AssetAddItemDetails";

export default function AssetAddItemScreen() {
  return (
    <View style={styles.container}>
      <AssetAddItemDetails />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
});
