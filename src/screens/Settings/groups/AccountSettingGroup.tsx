import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { readStoredAuthTokens } from "../../../context/authStorage";
import {
  readFaceIdEnabled,
  writeFaceIdEnabled,
} from "../../../services/auth/faceIdFlag";
import {
  BiometricKind,
  biometricIcon,
  biometricName,
  classifyBiometricError,
  getBiometricKind,
  isDeviceLockAvailable,
  promptUnlock,
  readDeviceLockEnabled,
  resetBiometricMarker,
  writeBiometricMarker,
  writeDeviceLockEnabled,
} from "../../../services/auth/biometric";
import type { StackNavigation } from "../../../types";
import { C } from "../../../utils/helpers/colors";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { SettingRowItem, SettingSwitchRow } from "../shared/SettingRowItem";
import ChangePasswordModal from "../shared/ChangePasswordModal";
import { useChangePasswordFlow } from "../shared/useChangePasswordFlow";
import { AppAlert } from "../../../components/ui/AppAlert";

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Nhóm Tài khoản: hồ sơ, danh thiếp QR, đổi mật khẩu, đăng nhập FaceID / vân
 * tay / khoá màn hình.
 */
export default function AccountSettingGroup() {
  const navigation = useNavigation<StackNavigation<"SettingGroup">>();
  const isMountedRef = useRef(true);

  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  // iOS: "faceid" khi máy có Face ID; Android: vân tay / khuôn mặt. `null` thì
  // ẩn dòng công tắc.
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(
    null,
  );
  // Android 11+: mở app bằng khoá màn hình (mẫu hình / mã PIN / mật khẩu máy).
  // Máy không có khoá màn hình thì ẩn dòng công tắc.
  const [isDeviceLockEnabled, setIsDeviceLockEnabled] = useState(false);
  const [isDeviceLockOnDevice, setIsDeviceLockOnDevice] = useState(false);
  const { openChangePassword, changePasswordModalProps } =
    useChangePasswordFlow();

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
      isDeviceLockAvailable().then((available) => {
        if (isMountedRef.current) setIsDeviceLockOnDevice(available);
      });
      readDeviceLockEnabled().then((value) => {
        if (isMountedRef.current) setIsDeviceLockEnabled(value);
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
      // Android không còn dùng marker, xoá luôn marker cũ của bản thử trước.
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
            : "Thiết bị chưa cài vân tay hoặc khuôn mặt. Vui lòng cài trong Cài đặt của máy.",
        );
        setIsFaceIdEnabled(false);
        return;
      }
      if (!token && !refreshToken) {
        AppAlert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        setIsFaceIdEnabled(false);
        return;
      }
      // iOS ghi marker (không hỏi) rồi đọc lại để hỏi Face ID. Android không
      // có marker, chỉ hỏi để chắc người dùng mở được bằng cách này.
      if (Platform.OS === "ios") await writeBiometricMarker();
      const unlocked = await promptUnlock({
        title: `Xác thực ${label}`,
        subtitle: `Xác nhận để bật đăng nhập bằng ${label}`,
        description: `Bật đăng nhập nhanh bằng ${label}`,
        cancel: "Huỷ",
      });
      if (!unlocked) {
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

  const handleToggleDeviceLock = async (value: boolean) => {
    if (!isMountedRef.current) return;
    const title = "Khoá màn hình";
    if (!value) {
      await writeDeviceLockEnabled(false);
      if (!isMountedRef.current) return;
      setIsDeviceLockEnabled(false);
      AppAlert.alert(title, "Đã tắt đăng nhập bằng khoá màn hình.");
      return;
    }
    try {
      const { token, refreshToken } = await readStoredAuthTokens();
      if (!isMountedRef.current) return;
      if (!(await isDeviceLockAvailable())) {
        AppAlert.alert(
          "Khoá màn hình chưa sẵn sàng",
          "Thiết bị chưa cài khoá màn hình. Vui lòng cài mẫu hình, mã PIN hoặc mật khẩu trong Cài đặt của máy.",
        );
        return;
      }
      if (!token && !refreshToken) {
        AppAlert.alert("Không thể bật", "Bạn cần đăng nhập trước.");
        return;
      }
      // Hỏi đúng khoá màn hình, như vân tay.
      await promptUnlock(
        {
          title: "Xác thực khoá màn hình",
          subtitle: "Xác nhận để bật đăng nhập bằng khoá màn hình",
          cancel: "Huỷ",
        },
        { biometric: false, deviceLock: true },
      );
      await writeDeviceLockEnabled(true);
      if (!isMountedRef.current) return;
      setIsDeviceLockEnabled(true);
      AppAlert.alert(title, "Đã bật đăng nhập bằng khoá màn hình!");
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setIsDeviceLockEnabled(false);
      if (classifyBiometricError(err) !== "cancel") {
        AppAlert.alert("Lỗi", "Không thể bật khoá màn hình.");
      }
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
          onPress={openChangePassword}
          isLast={!isFaceIdAvailable && !isDeviceLockOnDevice}
        />
        {isFaceIdAvailable ? (
          <SettingSwitchRow
            iconName={biometricIcon(biometricKind)}
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
            isLast={!isDeviceLockOnDevice}
          />
        ) : null}
        {isDeviceLockOnDevice ? (
          <SettingSwitchRow
            iconName="lock-pattern"
            lib="material-community"
            iconBg={C.sky}
            label="Đăng nhập bằng khoá màn hình"
            sublabel="Mẫu hình, mã PIN hoặc mật khẩu của máy"
            value={isDeviceLockEnabled}
            onValueChange={handleToggleDeviceLock}
            isLast
          />
        ) : null}
      </SettingSectionGroup>

      <ChangePasswordModal {...changePasswordModalProps} />
    </>
  );
}
