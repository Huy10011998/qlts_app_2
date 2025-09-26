import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { IsLoadingProps } from "../../types";

export default function IsLoading({
  size = "large",
  color = "#FF3333",
  style,
}: IsLoadingProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
