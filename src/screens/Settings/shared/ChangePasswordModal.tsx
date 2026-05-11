import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { C } from "../../../utils/helpers/colors";
import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import SettingPasswordInput from "./SettingPasswordInput";

type ChangePasswordModalProps = {
  visible: boolean;
  isLoading: boolean;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  onChangeOldPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function ChangePasswordModal({
  visible,
  isLoading,
  oldPassword,
  newPassword,
  confirmPassword,
  onChangeOldPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="slide"
      onClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      overlayStyle={styles.overlay}
      sheetStyle={styles.sheet}
      showHandle
    >
      <LinearGradient colors={[C.red, C.redDeep]} style={styles.iconGradient}>
        <Ionicons name="lock-closed" size={22} color="#fff" />
      </LinearGradient>

      <Text style={styles.title}>Đổi mật khẩu</Text>
      <Text style={styles.subtitle}>
        Nhập mật khẩu hiện tại và mật khẩu mới
      </Text>

      <SettingPasswordInput
        placeholder="Mật khẩu hiện tại"
        value={oldPassword}
        onChangeText={onChangeOldPassword}
      />
      <SettingPasswordInput
        placeholder="Mật khẩu mới"
        value={newPassword}
        onChangeText={onChangeNewPassword}
      />
      <SettingPasswordInput
        placeholder="Xác nhận mật khẩu mới"
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[C.redLight, C.red]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.confirmBtn}
        >
          <Text style={styles.confirmText}>Xác nhận đổi mật khẩu</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={styles.cancelText}>Hủy</Text>
      </TouchableOpacity>
    </BottomSheetModalShell>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,15,30,0.55)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 4,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
    shadowColor: C.red,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: C.textSub,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  confirmBtn: {
    borderRadius: 14,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: C.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    color: C.textSub,
    fontSize: 14,
    fontWeight: "600",
  },
});
