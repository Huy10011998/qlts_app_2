import React from "react";
import { View, StyleSheet } from "react-native";
import CameraList from "../../components/camera/CameraList";

export default function CameraListScreen() {
  return (
    <View style={styles.container}>
      <CameraList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
});
