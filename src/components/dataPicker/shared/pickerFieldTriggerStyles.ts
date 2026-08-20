import { AppColors } from "../../../utils/helpers/colors";
import { StyleSheet } from "react-native";

export const makePickerFieldTriggerStyles = (c: AppColors) =>
  StyleSheet.create({
    input: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 12,
      minHeight: 48,
      paddingVertical: 0,
      backgroundColor: c.surface,
    },
    text: {
      color: c.text,
      flex: 1,
      fontSize: 14,
      textAlignVertical: "center",
    },
    textInput: {
      color: c.text,
      flex: 1,
      minHeight: 48,
      paddingTop: 0,
      paddingBottom: 0,
      paddingVertical: 0,
      fontSize: 14,
      textAlignVertical: "center",
    },
    placeholder: {
      color: c.textMuted,
    },
    icon: {
      marginLeft: 0,
    },
  });
