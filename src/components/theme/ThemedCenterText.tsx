import React from "react";
import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
import RenderHtml from "react-native-render-html";
import { CenterTextProps } from "../../types";

export default function CenterText({ text }: CenterTextProps) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.centerContent}>
      {text ? (
        <RenderHtml contentWidth={width} source={{ html: text }} />
      ) : (
        <Text>---</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 10,
  },
});
