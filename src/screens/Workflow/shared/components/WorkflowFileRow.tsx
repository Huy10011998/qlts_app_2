import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { getFileExtension } from "../workflowAttachments";

type Props = {
  name: string;
  /** Dòng phụ: dung lượng · người tải · ngày. */
  meta?: string;
  onPress?: () => void;
  onRemove?: () => void;
  /** Đang chờ tải lên (file vừa chọn trên form). */
  pending?: boolean;
};

const iconForName = (name: string) => {
  const ext = getFileExtension(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) return "image-outline";
  if (ext === "pdf") return "document-text-outline";
  if (["xls", "xlsx", "csv"].includes(ext)) return "grid-outline";
  if (["doc", "docx", "txt"].includes(ext)) return "reader-outline";
  if (["mp4", "mov"].includes(ext)) return "videocam-outline";
  return "document-outline";
};

/** Một dòng file: icon theo đuôi, tên, dòng phụ, nút xoá tuỳ chọn. */
export default function WorkflowFileRow({ name, meta, onPress, onRemove, pending }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
    >
      <View style={[styles.icon, pending && styles.iconPending]}>
        <Ionicons name={iconForName(name)} size={18} color={pending ? c.textSub : c.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Ionicons name="trash-outline" size={18} color={c.red} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.accentLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    iconPending: {
      backgroundColor: c.surfaceAlt,
    },
    body: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    remove: {
      padding: 6,
      marginLeft: 6,
    },
  });
