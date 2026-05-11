import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";

type IosSpinnerPickerSheetProps = {
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export default function IosSpinnerPickerSheet({
  children,
  onCancel,
  onConfirm,
  visible,
}: IosSpinnerPickerSheetProps) {
  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="slide"
      onClose={onCancel}
      sheetStyle={styles.pickerContainer}
    >
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.toolbarText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onConfirm}>
          <Text style={[styles.toolbarText, styles.toolbarTextBold]}>Chọn</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerBox}>{children}</View>
    </BottomSheetModalShell>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  toolbarText: {
    fontSize: 18,
    color: "#E31E24",
  },
  toolbarTextBold: {
    fontWeight: "bold",
  },
  pickerBox: {
    backgroundColor: "#fff",
    height: 250,
    width: "100%",
    alignItems: "center",
  },
});
