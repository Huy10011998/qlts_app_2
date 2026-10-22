import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
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
  BiometricKind,
  biometricName,
  classifyBiometricError,
  getBiometricKind,
  readBiometricMarker,
  resetBiometricMarker,
  writeBiometricMarker,
} from "../../../services/auth/biometric";
import { AUTH_LOGIN_SERVICE } from "../../../constants/AuthStorage";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import { warn } from "../../../utils/Logger";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem, SettingSwitchRow } from "../shared/SettingRowItem";
import ChangePasswordModal from "../shared/ChangePasswordModal";
import { AppAlert } from "../../../components/ui/AppAlert";

const isAuthExpiredError = (error: any) =>
  error?.NEED_LOGIN ||
  error?.response?.status === 401 ||
  error?.response?.status === 403;

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** Nhóm Tài khoản: hồ sơ, danh thiếp QR, đổi mật khẩu, đăng nhập FaceID / vân tay. */
export default function AccountSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();
  const { logoutReason } = useAuth();
  const isMountedRef = useRef(true);

  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  // iOS: "faceid" khi máy có Face ID; Android: vân tay / khuôn mặt. `null` thì
  // ẩn dòng công tắc.
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(
    null,
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    isMountedRef.current = true;
    // Cờ chỉ đổi từ chính công tắc bên dưới nên đọc một lần lúc mở màn là đủ.
    readFaceIdEnabled()
      .then((value) => {
        if (isMountedRef.current) setIsFaceIdEnabled(value);
      })
      .catch(() => {});
    if (Platform.OS === "android") {
      getBiometricKind().then((kind) => {
        if (isMountedRef.current) setBiometricKind(kind);
      });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggleFaceID = async (value: boolean) => {
    if (!isMountedRef.current) return;
    const label = biometricName(
      Platform.OS === "ios" ? "faceid" : biometricKind,
    );
    const title = capitalize(label);
    if (!value) {
      await resetBiometricMarker();
      await writeFaceIdEnabled(false);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      AppAlert.alert(title, `Đã tắt đăng nhập bằng ${label}.`);
      return;
    }
    try {
      const { token, refreshToken } = await readStoredAuthTokens();
      if (!isMountedRef.current) return;
      const kind = await getBiometricKind();
      if (!isMountedRef.current) return;
      if (!kind) {
        AppAlert.alert(
          `${title} chưa sẵn sàng`,
          Platform.OS === "ios"
            ? "Thiết bị chưa hỗ trợ FaceID hoặc chưa thiết lập FaceID."
            : "Thiết bị chưa cài vân tay. Vui lòng cài vân tay trong Cài đặt của máy.",
        );
        setIsFaceIdEnabled(false);
        return;
      }
      if (!token && !refreshToken) {
        AppAlert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }
      // Android hỏi vân tay ngay lúc ghi; lần đọc xác nhận ngay sau đó không
      // hỏi lại. iOS chỉ hỏi ở lần đọc.
      const prompt = {
        title: `Xác thực ${label}`,
        subtitle: `Xác nhận để bật đăng nhập bằng ${label}`,
        description: `Bật đăng nhập nhanh bằng ${label}`,
        cancel: "Huỷ",
      };
      await writeBiometricMarker(
        Platform.OS === "android" ? prompt : undefined,
      );
      const confirmation = await readBiometricMarker(prompt);
      if (!confirmation) {
        await resetBiometricMarker();
        setIsFaceIdEnabled(false);
        return;
      }
      await writeFaceIdEnabled(true);
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(true);
      AppAlert.alert(title, `Đã bật đăng nhập bằng ${label}!`);
    } catch (err: any) {
      await resetBiometricMarker();
      if (!isMountedRef.current) return;
      setIsFaceIdEnabled(false);
      const biometricError = classifyBiometricError(err);
      if (biometricError === "lockout") {
        AppAlert.alert(
          "Tạm khoá",
          `Thử ${label} sai quá nhiều lần. Vui lòng thử lại sau.`,
        );
      } else if (biometricError !== "cancel") {
        AppAlert.alert("Lỗi", `Không thể bật ${label}.`);
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
      AppAlert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      AppAlert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    if (oldPassword === newPassword) {
      AppAlert.alert("Lỗi", "Mật khẩu mới phải khác mật khẩu cũ.");
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

        AppAlert.alert("Thành công", "Đổi mật khẩu thành công!");
        closeModal();
      } else {
        AppAlert.alert("Lỗi", responseMessage);
      }
    } catch (error: any) {
      if (isAuthExpiredError(error) || logoutReason === "EXPIRED") return;
      AppAlert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      if (isMountedRef.current) setIsChangingPassword(false);
    }
  };

  // iOS giữ như cũ: luôn có dòng Face ID. Android chỉ hiện khi máy có sinh trắc.
  const isFaceIdAvailable = Platform.OS === "ios" || biometricKind !== null;

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
            iconName={
              biometricKind === "fingerprint" ? "fingerprint" : "face-recognition"
            }
            lib="material-community"
            iconBg={C.violet}
            label={
              Platform.OS === "ios"
                ? "Đăng nhập FaceID"
                : `Đăng nhập bằng ${biometricName(biometricKind)}`
            }
            sublabel={
              Platform.OS === "ios"
                ? "Dùng nhận diện khuôn mặt"
                : `Mở app bằng ${biometricName(biometricKind)} thay vì vào thẳng`
            }
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
