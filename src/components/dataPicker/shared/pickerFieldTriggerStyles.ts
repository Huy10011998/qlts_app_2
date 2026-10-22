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
    // Trường bị khoá: cùng dáng với ô chọn Tham chiếu bị khoá trong form động.
    blocked: {
      opacity: 0.55,
      backgroundColor: c.surfaceAlt,
    },
    icon: {
      marginLeft: 0,
    },
  });
