import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { useThemeColor } from "../../hooks/useThemeColor";
import { ThemedTextInputProps } from "../../types/Index";

export function ThemedTextInput({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedTextInputProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );
  const textColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "text"
  );
  const placeholderColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "placeholderTextColor"
  );
  const borderColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "borderColor"
  );

  return (
    <TextInput
      style={[
        styles.input,
        { backgroundColor, color: textColor, borderColor },
        style,
      ]}
      placeholderTextColor={placeholderColor}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "500",
    borderBottomWidth: 1,
    width: "100%",
  },
});
