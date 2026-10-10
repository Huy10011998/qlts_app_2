import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { WorkflowPickedFile } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { AttachSource, pickWorkflowFiles } from "../workflowAttachments";

const SOURCES: Array<{ key: AttachSource; label: string; icon: string }> = [
  { key: "camera", label: "Chụp ảnh", icon: "camera-outline" },
  { key: "library", label: "Ảnh trong máy", icon: "images-outline" },
  { key: "document", label: "Tài liệu (PDF, Word, Excel...)", icon: "document-attach-outline" },
];

/**
 * Đợi sheet đóng hẳn rồi mới mở trình chọn: iOS không trình bày được màn chọn
 * ảnh / file khi một Modal còn đang trượt xuống.
 */
const SHEET_CLOSE_DELAY = 400;

/**
 * Nút đính kèm mở sheet chọn nguồn (Chụp ảnh / Ảnh / Tài liệu). Dùng sheet chứ
 * không dùng Alert vì Alert trên Android chỉ hiện tối đa 3 nút.
 *
 * Trả `open()` và `sheet` — màn gọi phải render `sheet`.
 */
export function useAttachmentPicker(
  onPicked: (files: WorkflowPickedFile[]) => void,
  multiple = true,
) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const onPickedRef = useRef(onPicked);
  onPickedRef.current = onPicked;

  const open = useCallback(() => setVisible(true), []);

  const handlePick = (source: AttachSource) => {
    setVisible(false);
    setTimeout(async () => {
      const files = await pickWorkflowFiles(source, multiple);
      if (files.length) onPickedRef.current(files);
    }, SHEET_CLOSE_DELAY);
  };

  const sheet = (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.title}>Đính kèm</Text>
          {SOURCES.map((source) => (
            <TouchableOpacity
              key={source.key}
              style={styles.option}
              onPress={() => handlePick(source.key)}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={source.icon} size={20} color={c.red} />
              </View>
              <Text style={styles.optionText}>{source.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={() => setVisible(false)}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return { open, sheet };
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      marginBottom: 6,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    optionText: {
      fontSize: 15,
      color: c.text,
    },
    cancel: {
      alignItems: "center",
      paddingVertical: 14,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textSub,
    },
  });
