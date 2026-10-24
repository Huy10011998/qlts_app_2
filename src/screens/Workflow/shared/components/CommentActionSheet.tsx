import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { WorkflowComment } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { getReplyPreview } from "../../Common/realtimeCommentRules";

/**
 * Sheet mở ra trên Modal fade: đợi chừng này rồi mới mở hộp xác nhận / focus ô
 * nhập — iOS không trình bày được Modal mới khi Modal cũ còn đang tắt.
 */
export const COMMENT_SHEET_CLOSE_DELAY = 350;

type Props = {
  /** Tin đang giữ; null = đóng sheet. */
  comment: WorkflowComment | null;
  canReply: boolean;
  onReply: (comment: WorkflowComment) => void;
  onRecall: (comment: WorkflowComment) => void;
  onClose: () => void;
};

/**
 * Giữ 1 tin CỦA MÌNH (7-Mobile-Realtime-BinhLuan mục 8): Trả lời · Thu hồi. Tin
 * người khác chỉ có Trả lời nên giữ là vào trả lời luôn, không qua sheet. Cùng
 * kiểu sheet Đính kèm.
 */
export default function CommentActionSheet({
  comment,
  canReply,
  onReply,
  onRecall,
  onClose,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const preview = comment ? getReplyPreview(comment.noiDung, comment.tenFile) : "";

  return (
    <Modal
      visible={!!comment}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {preview ? (
            <Text style={styles.preview} numberOfLines={2}>
              {preview}
            </Text>
          ) : null}
          {canReply ? (
            <TouchableOpacity style={styles.option} onPress={() => comment && onReply(comment)}>
              <View style={styles.optionIcon}>
                <Ionicons name="arrow-undo-outline" size={20} color={c.accent} />
              </View>
              <Text style={styles.optionText}>Trả lời</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.option} onPress={() => comment && onRecall(comment)}>
            <View style={[styles.optionIcon, styles.optionIconDanger]}>
              <Ionicons name="trash-outline" size={20} color={c.red} />
            </View>
            <Text style={[styles.optionText, styles.optionTextDanger]}>Thu hồi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
    preview: {
      fontSize: 13,
      color: c.textSub,
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
      backgroundColor: c.accentLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    optionIconDanger: {
      backgroundColor: c.redSurface,
    },
    optionText: {
      fontSize: 15,
      color: c.text,
    },
    optionTextDanger: {
      color: c.red,
      fontWeight: "600",
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
