import { Text, TextInput } from "react-native";

export const READABLE_TEXT_MAX_SCALE = 1.3;
export const COMPACT_TEXT_MAX_SCALE = 1.15;

type ScalableTextComponent = {
  defaultProps?: Record<string, unknown>;
};

export function configureTextScalingDefaults() {
  const textComponent = Text as ScalableTextComponent;
  const textInputComponent = TextInput as ScalableTextComponent;

  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    maxFontSizeMultiplier:
      textComponent.defaultProps?.maxFontSizeMultiplier ??
      READABLE_TEXT_MAX_SCALE,
  };

  textInputComponent.defaultProps = {
    ...textInputComponent.defaultProps,
    maxFontSizeMultiplier:
      textInputComponent.defaultProps?.maxFontSizeMultiplier ??
      READABLE_TEXT_MAX_SCALE,
  };
}
