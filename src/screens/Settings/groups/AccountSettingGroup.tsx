import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import * as Keychain from "react-native-keychain";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../context/AuthContext";
import { readStoredAuthTokens } from "../../../context/authStorage";
import { changePasswordApi } from "../../../services";
import {
  readFaceIdEnabled,
  writeFaceIdEnabled,
} from "../../../services/auth/faceIdFlag";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_LOGIN_SERVICE,
  FACE_ID_MARKER_PASSWORD,
  FACE_ID_MARKER_USERNAME,
} from "../../../constants/AuthStorage";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import { warn } from "../../../utils/Logger";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem, SettingSwitchRow } from "../shared/SettingRowItem";
import ChangePasswordModal from "../shared/ChangePasswordModal";

const isAuthExpiredError = (error: any) =>
  error?.NEED_LOGIN ||
  error?.response?.status === 401 ||
  error?.response?.status === 403;

/** Nhóm Tài khoản: hồ sơ, danh thiếp QR, đổi mật khẩu, đăng nhập FaceID. */
export default function AccountSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();
  const { logoutReason } = useAuth();
  const isMountedRef = useRef(true);

  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    isMountedRef.current = true;
    // Cờ chỉ đổi từ chính công tắc bên dưới nên đọc một lần lúc mở màn là đủ.
    if (Platform.OS === "ios") {
      readFaceIdEnabled()
        .then((value) => {
          if (isMountedRef.current) setIsFaceIdEnabled(value);
        })
        .catch(() => {});
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;
    if (!value) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      await writeFaceIdEnabled(false);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      Alert.alert("FaceID", "Đã tắt đăng nhập bằng FaceID.");
      return;
    }
    try {
      const { token, refreshToken } = await readStoredAuthTokens();
      if (!isMountedRef.current) return;
      const biometryType = await Keychain.getSupportedBiometryType();
      if (!isMountedRef.current) return;
      if (biometryType !== Keychain.BIOMETRY_TYPE.FACE_ID) {
        Alert.alert(
          "FaceID chưa sẵn sàng",
          "Thiết bị chưa hỗ trợ FaceID hoặc chưa thiết lập FaceID.",
        );
        setIsFaceIdEnabled(false);
        return;
      }
      if (!token && !refreshToken) {
        Alert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }
      await Keychain.setGenericPassword(
        FACE_ID_MARKER_USERNAME,
        FACE_ID_MARKER_PASSWORD,
        {
          service: FACE_ID_LOGIN_SERVICE,
          accessControl:
            Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        },
      );
      const confirmation = await Keychain.getGenericPassword({
        service: FACE_ID_LOGIN_SERVICE,
        authenticationPrompt: {
          title: "Xác thực FaceID",
          subtitle: "Xác nhận để bật đăng nhập bằng FaceID",
          description: "Bật đăng nhập nhanh bằng FaceID",
          cancel: "Huỷ",
        },
      });
      if (!confirmation) {
        await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
        setIsFaceIdEnabled(false);
        return;
      }
      await writeFaceIdEnabled(true);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(true);
      Alert.alert("FaceID", "Đã bật đăng nhập bằng FaceID!");
    } catch (err: any) {
      await Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE });
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      const code = err?.code;
      const message = String(err?.message ?? "");
      const normalizedMessage = message.toLowerCase();
      const isCancelled =
        code === -128 ||
        code === "-128" ||
        normalizedMessage.includes("cancel") ||
        message.includes("UserCancel") ||
        err?.name === "LAErrorUserCancel";
      if (!isCancelled) {
        Alert.alert("Lỗi", "Không thể bật FaceID.");
      }
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới phải khác mật khẩu cũ.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await changePasswordApi(oldPassword, newPassword);
      const isChangePasswordSuccess =
        response?.success === true ||
        response?.data === 1 ||
        (typeof response?.data === "object" &&
          response?.data?.success === true);
      const responseMessage =
        response?.message ||
        (typeof response?.data === "object"
          ? response?.data?.message
          : undefined) ||
        "Đổi mật khẩu thất bại!";

      if (isChangePasswordSuccess) {
        try {
          const saved = await Keychain.getGenericPassword({
            service: AUTH_LOGIN_SERVICE,
          });
          if (saved) {
            await Keychain.setGenericPassword(saved.username, newPassword, {
              service: AUTH_LOGIN_SERVICE,
              accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
          }
        } catch (storageError) {
          warn("[Settings] Update saved password failed:", storageError);
        }

        Alert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal();
      } else {
        Alert.alert("Lỗi", responseMessage);
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") return;
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      if (isMountedRef.current) setIsChangingPassword(false);
    }
  };

  const isFaceIdAvailable = Platform.OS === "ios";

  return (
    <>
      <SettingSectionGroup accent={getSettingGroupColor("account")}>
        <SettingRowItem
          iconName="person-outline"
          iconBg={C.blue}
          label="Hồ sơ cá nhân"
          sublabel="Xem thông tin, đổi ảnh đại diện"
          onPress={() => navigation.navigate("Profile")}
        />
        <SettingRowItem
          iconName="qr-code-outline"
          iconBg={C.emerald}
          label="Thông tin QrCode"
          sublabel="Danh thiếp QR của bạn"
          onPress={() => navigation.navigate("QrCode")}
        />
        <SettingRowItem
          iconName="lock-closed-outline"
          iconBg={C.amber}
          label="Đổi mật khẩu"
          sublabel="Cập nhật mật khẩu đăng nhập"
          onPress={() => setIsModalVisible(true)}
          isLast={!isFaceIdAvailable}
        />
        {isFaceIdAvailable ? (
          <SettingSwitchRow
            iconName="face-recognition"
            lib="material-community"
            iconBg={C.violet}
            label="Đăng nhập FaceID"
            sublabel="Dùng nhận diện khuôn mặt"
            value={isFaceIdEnabled}
            onValueChange={handleToggleFaceID}
            isLast
          />
        ) : null}
      </SettingSectionGroup>

      <ChangePasswordModal
        visible={isModalVisible}
        isLoading={isChangingPassword}
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onChangeOldPassword={setOldPassword}
        onChangeNewPassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onClose={closeModal}
        onSubmit={handleChangePassword}
      />
    </>
  );
}
