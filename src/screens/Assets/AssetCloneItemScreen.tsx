import React from "react";
import { StyleSheet, View } from "react-native";
import AssetCloneItem from "../../components/assets/AssetCloneItem";

export default function AssetCloneItemScreen() {
  return (
    <View style={styles.container}>
      <AssetCloneItem />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
});
