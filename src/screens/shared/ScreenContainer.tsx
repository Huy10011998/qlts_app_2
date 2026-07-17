import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { C } from "../../utils/helpers/colors";

type ScreenContainerProps = PropsWithChildren<{
  backgroundColor?: string;
}>;

export default function ScreenContainer({
  children,
  backgroundColor = C.bg,
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
