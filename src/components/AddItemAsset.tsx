import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";

export function AddItemAsset() {
  return (
    <View>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log("FAB pressed")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  fab: {
    position: "absolute",
    bottom: 24,
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
  },
});
