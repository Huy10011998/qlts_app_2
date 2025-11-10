import React from "react";
import { View, StyleSheet } from "react-native";
import AssetList from "../../components/assets/AssetList";

export default function AssetListScreen() {
  return (
    <View style={styles.container}>
      <AssetList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
});
