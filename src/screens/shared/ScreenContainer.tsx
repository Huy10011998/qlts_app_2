import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

type ScreenContainerProps = PropsWithChildren<{
  backgroundColor?: string;
}>;

export default function ScreenContainer({
  children,
  backgroundColor = "#F0F2F8",
}: ScreenContainerProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
