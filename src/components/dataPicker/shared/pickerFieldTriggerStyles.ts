import { StyleSheet } from "react-native";

export const pickerFieldTriggerStyles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 0,
    backgroundColor: "#fff",
  },
  text: {
    color: "#000",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  textInput: {
    color: "#000",
    flex: 1,
    height: 48,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  placeholder: {
    color: "#999",
  },
  icon: {
    marginLeft: 0,
  },
});
