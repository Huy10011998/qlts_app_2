import { useEffect, useRef, useState } from "react";
import * as Keychain from "react-native-keychain";
import { AppAlert } from "../../../components/ui/AppAlert";
import { AUTH_LOGIN_SERVICE } from "../../../constants/AuthStorage";
import { useAuth } from "../../../context/AuthContext";
import { changePasswordApi } from "../../../services";
import { warn } from "../../../utils/Logger";

const isAuthExpiredError = (error: any) =>
  error?.NEED_LOGIN ||
  error?.response?.status === 401 ||
  error?.response?.status === 403;

/**
 * Hộp Đổi mật khẩu — dùng chung cho dòng trong nhóm Tài khoản và lối tắt trên
 * thẻ hồ sơ đầu màn Cài đặt. Trả về hàm mở hộp và props cho
 * `ChangePasswordModal`.
 */
export function useChangePasswordFlow() {
  const { logoutReason } = useAuth();
  const isMountedRef = useRef(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  return {
    openChangePassword: () => setIsModalVisible(true),
    changePasswordModalProps: {
      visible: isModalVisible,
      isLoading: isChangingPassword,
      oldPassword,
      newPassword,
      confirmPassword,
      onChangeOldPassword: setOldPassword,
      onChangeNewPassword: setNewPassword,
      onChangeConfirmPassword: setConfirmPassword,
      onClose: closeModal,
      onSubmit: handleChangePassword,
    },
  };
}
