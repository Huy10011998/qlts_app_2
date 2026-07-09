import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [didPressSubmit, setDidPressSubmit] = useState(false);
  const isKeyboardVisible = keyboardHeight > 0;
  const isCompactHeight = height < 760;
  const sheetBottomPadding = Math.max(insets.bottom, 16) + 16;
  const sheetMaxHeightRatio = isKeyboardVisible
    ? isCompactHeight
      ? 0.64
      : 0.58
    : isCompactHeight
    ? 0.64
    : 0.56;
  const keyboardSpace =
    isKeyboardVisible
      ? Math.min(Math.max(keyboardHeight * 0.14, 40), 80)
      : 0;
  const isOldPasswordMissing = didPressSubmit && !oldPassword.trim();
  const isNewPasswordMissing = didPressSubmit && !newPassword.trim();
  const isConfirmPasswordMissing =
    didPressSubmit && !confirmPassword.trim();

  const handleSubmitPress = () => {
    setDidPressSubmit(true);

    if (
      !oldPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      return;
    }

    onSubmit();
  };

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setDidPressSubmit(false);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  return (
    <BottomSheetModalShell
      avoidKeyboard
      keyboardOffset={sheetBottomPadding}
      visible={visible}
      animationType="slide"
      onClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      overlayStyle={styles.overlay}
      sheetStyle={[
        styles.sheet,
        {
          maxHeight: height * sheetMaxHeightRatio,
          paddingBottom: sheetBottomPadding,
        },
      ]}
      showHandle
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          hitSlop={10}
          onPress={onClose}
          disabled={isLoading}
        >
          <Ionicons name="close" size={22} color="#4B5563" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Đổi mật khẩu
        </Text>

        <TouchableOpacity
          style={[styles.headerSubmitButton, isLoading && styles.disabledBtn]}
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
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isCompactHeight && styles.scrollContentCompact,
          { paddingBottom: keyboardSpace + (isKeyboardVisible ? 16 : 6) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LinearGradient
          colors={[C.red, C.redDeep]}
          style={[styles.iconGradient, isCompactHeight && styles.iconCompact]}
        >
          <Ionicons name="lock-closed" size={22} color="#fff" />
        </LinearGradient>

        <Text style={[styles.title, isCompactHeight && styles.titleCompact]}>
          Đổi mật khẩu
        </Text>
        <Text
          style={[styles.subtitle, isCompactHeight && styles.subtitleCompact]}
        >
          Nhập mật khẩu hiện tại và mật khẩu mới
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
    paddingTop: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: 0,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -2,
    marginBottom: 10,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
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
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 12.5,
    color: C.textSub,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  subtitleCompact: {
    fontSize: 12,
    marginBottom: 16,
  },
  disabledBtn: {
    opacity: 0.65,
  },
});
