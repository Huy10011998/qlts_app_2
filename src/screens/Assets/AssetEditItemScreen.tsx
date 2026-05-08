import React from "react";
import { StyleSheet, View } from "react-native";
import AssetEditItem from "../../components/assets/AssetEditItem";

export default function AssetEditItemScreen() {
  return (
    <View style={styles.container}>
      <AssetEditItem />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
});
