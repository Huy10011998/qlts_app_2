import {
  AppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
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
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onCancel}
      sheetStyle={styles.pickerContainer}
    >
      <View style={[styles.toolbar, { borderColor: separatorColor }]}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.toolbarText} allowFontScaling={false}>
            Hủy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onConfirm}>
          <Text
            style={[styles.toolbarText, styles.toolbarTextBold]}
            allowFontScaling={false}
          >
            Chọn
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerBox}>{children}</View>
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    pickerContainer: {
      backgroundColor: c.surface,
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
      borderColor: c.border,
    },
    toolbarText: {
      fontSize: 18,
      color: c.red,
    },
    toolbarTextBold: {
      fontWeight: "bold",
    },
    pickerBox: {
      backgroundColor: c.surface,
      height: 250,
      width: "100%",
      alignItems: "center",
    },
  });
