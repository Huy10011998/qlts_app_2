import React from "react";
import { View, StyleSheet } from "react-native";
import CameraListGrid from "../../components/camera/CameraListGrid";

export default function CameraListGridScreen() {
  return (
    <View style={styles.container}>
      <CameraListGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
});
