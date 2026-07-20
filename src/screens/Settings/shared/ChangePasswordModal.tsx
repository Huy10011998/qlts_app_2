import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import {
  C,
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";
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
  const colors = useAppColors();
  const { height } = useWindowDimensions();
  const hairlineBorderColor = useHairlineBorderColor();
  const [didPressSubmit, setDidPressSubmit] = useState(false);
  const isCompactHeight = height < 760;
  const isOldPasswordMissing = didPressSubmit && !oldPassword.trim();
  const isNewPasswordMissing = didPressSubmit && !newPassword.trim();
  const isConfirmPasswordMissing = didPressSubmit && !confirmPassword.trim();

  const handleSubmitPress = () => {
    setDidPressSubmit(true);

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return;
    }

    onSubmit();
  };

  useEffect(() => {
    if (!visible) {
      setDidPressSubmit(false);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.backdrop} />
        <View
          style={[
            styles.popup,
            {
              backgroundColor: colors.surface,
              borderColor: hairlineBorderColor,
              shadowColor: colors.shadow,
            },
            isCompactHeight && styles.popupCompact,
            { maxHeight: height - 48 },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.headerIconButton,
                { backgroundColor: colors.surfaceAlt },
              ]}
              hitSlop={10}
              onPress={onClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerSubmitButton,
                isLoading && styles.disabledBtn,
              ]}
              onPress={handleSubmitPress}
              disabled={isLoading}
              activeOpacity={0.82}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.headerSubmitText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <LinearGradient
              colors={[C.red, C.redDeep]}
              style={[
                styles.iconGradient,
                isCompactHeight && styles.iconCompact,
              ]}
            >
              <Ionicons name="lock-closed" size={22} color="#fff" />
            </LinearGradient>

            <Text
              style={[
                styles.title,
                { color: colors.text },
                isCompactHeight && styles.titleCompact,
              ]}
            >
              Đổi mật khẩu
            </Text>

            <SettingPasswordInput
              placeholder="Mật khẩu hiện tại"
              value={oldPassword}
              onChangeText={onChangeOldPassword}
              hasError={isOldPasswordMissing}
            />
            <SettingPasswordInput
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChangeText={onChangeNewPassword}
              hasError={isNewPasswordMissing}
            />
            <SettingPasswordInput
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={onChangeConfirmPassword}
              hasError={isConfirmPasswordMissing}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(10,15,30,0.55)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popup: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  popupCompact: {
    padding: 20,
  },
  scrollContent: {
    paddingTop: 4,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  headerSubmitButton: {
    minWidth: 58,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: C.red,
  },
  headerSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    includeFontPadding: false,
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
  iconCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 18,
  },

  disabledBtn: {
    opacity: 0.65,
  },
});
