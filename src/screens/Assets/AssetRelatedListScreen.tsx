import React from "react";
import { View, StyleSheet } from "react-native";
import AssetRelatedList from "../../components/assets/AssetRelatedList";

export default function AssetRelaterListScreen() {
  return (
    <View style={styles.container}>
      <AssetRelatedList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
});
