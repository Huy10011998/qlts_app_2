import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useAppColors } from "../../utils/helpers/colors";

type ScreenContainerProps = PropsWithChildren<{
  backgroundColor?: string;
}>;

export default function ScreenContainer({
  children,
  backgroundColor,
}: ScreenContainerProps) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor ?? colors.bg },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
