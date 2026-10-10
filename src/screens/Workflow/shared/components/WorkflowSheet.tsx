import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import IsLoading from "../../../../components/ui/IconLoading";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Hàng nút cố định dưới đáy (không cuộn theo nội dung). */
  footer?: React.ReactNode;
  /** Phủ vòng xoay lên nội dung, chặn thao tác (đang gửi / đang kiểm tra). */
  loading?: boolean;
  loadingText?: string;
  /** Vẫn cho đóng khi đang loading — mặc định chặn để không mất request. */
  closableWhileLoading?: boolean;
  /** Phần tử vẽ thêm bên trong Modal (vd modal chọn nhân viên lồng bên trong). */
  overlay?: React.ReactNode;
};

/**
 * Bottom sheet dùng cho các thao tác của view Workflow (duyệt, chuyển trạng
 * thái, gia hạn...). Nội dung cuộn được, nút ở `footer` luôn nằm trên bàn phím.
 */
export default function WorkflowSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  loading,
  loadingText,
  closableWhileLoading,
  overlay,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const canClose = !loading || closableWhileLoading;
  const handleClose = () => {
    if (canClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={10}
              disabled={!canClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={c.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}

          {loading ? (
            <View style={styles.loadingOverlay}>
              <IsLoading size="large" color={c.red} style={styles.loadingSpinner} />
              {loadingText ? <Text style={styles.loadingText}>{loadingText}</Text> : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      {overlay}
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
      maxHeight: "92%",
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: "hidden",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderStrong,
      marginTop: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
    },
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    footer: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.loadingOverlay,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingSpinner: {
      flex: 0,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: c.textSecondary,
    },
  });
