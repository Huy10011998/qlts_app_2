import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { useThemeColor } from "../../hooks/useThemeColor";
import type { ThemedTextInputProps } from "../../types/index";
import { READABLE_TEXT_MAX_SCALE } from "../../utils/helpers/textScaling";

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
      maxFontSizeMultiplier={READABLE_TEXT_MAX_SCALE}
      placeholderTextColor={placeholderColor}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    paddingVertical: 0,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
    borderBottomWidth: 1,
    width: "100%",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
