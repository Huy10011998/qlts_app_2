import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { WorkflowPickedFile } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { formatFileSizeKb } from "../workflowAttachments";
import { useAttachmentPicker } from "./AttachmentPicker";
import WorkflowFileRow from "./WorkflowFileRow";

type Props = {
  label?: string;
  files: WorkflowPickedFile[];
  onChange: (files: WorkflowPickedFile[]) => void;
  multiple?: boolean;
  hint?: string;
};

/**
 * File chọn trên form / sheet nhưng CHƯA tải lên — server cần ID bản ghi
 * (phiếu, công việc, dòng lịch sử) trước, nên lưu xong mới đẩy từng file.
 */
export default function PendingFilesField({
  label = "Đính kèm",
  files,
  onChange,
  multiple = true,
  hint,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const picker = useAttachmentPicker(
    (picked) => onChange(multiple ? [...files, ...picked] : picked.slice(0, 1)),
    multiple,
  );

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity onPress={picker.open} style={styles.addButton} hitSlop={8}>
          <Ionicons name="attach" size={16} color={c.red} />
          <Text style={styles.addText}>Chọn file</Text>
        </TouchableOpacity>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {files.map((file, index) => (
        <WorkflowFileRow
          key={`${file.uri}-${index}`}
          name={file.name}
          meta={file.size != null ? formatFileSizeKb(file.size / 1024) : undefined}
          pending
          onRemove={() => onChange(files.filter((_, i) => i !== index))}
        />
      ))}
      {picker.sheet}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    block: {
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.redSurface,
    },
    addText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.red,
    },
    hint: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 4,
    },
  });
