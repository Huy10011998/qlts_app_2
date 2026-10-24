import React, { useEffect, useRef, useState } from "react";
import { AppAlert } from "../../../components/ui/AppAlert";
import { useAuth } from "../../../context/AuthContext";
import {
  clearTokenStorage,
  hardResetApi,
  resetAuthState,
} from "../../../services/data/callApi";
import { unregisterPushToken } from "../../../services/notifications";
import { clearPermissions } from "../../../store/PermissionSlice";
import { useAppDispatch } from "../../../store/hooks";
import { SettingRowItem } from "./SettingRowItem";

/** Dòng Đăng xuất cuối màn Cài đặt — hỏi xác nhận rồi mới thoát. */
export default function SettingLogoutRow() {
  const { logout } = useAuth();
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handlePressLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // PHẢI gọi trước khi xoá access token: request tắt token cần Authorization.
      // Bỏ qua bước này thì máy vẫn nhận noti của user cũ cho tới khi có người
      // khác đăng nhập trên chính máy đó — điện thoại dùng chung sẽ lộ thông tin.
      await unregisterPushToken();
      hardResetApi();
      resetAuthState();
      await clearTokenStorage();
      await logout();
      dispatch(clearPermissions());
    } finally {
      if (isMountedRef.current) setIsLoggingOut(false);
    }
  };

  return (
    <SettingRowItem
      iconName="log-out-outline"
      label="Đăng xuất"
      sublabel={
        isLoggingOut ? "Đang đăng xuất..." : "Thoát khỏi tài khoản hiện tại"
      }
      danger
      isLast
      disabled={isLoggingOut}
      onPress={() =>
        AppAlert.alert("Xác nhận", "Bạn muốn đăng xuất?", [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng xuất",
            style: "destructive",
            onPress: handlePressLogout,
          },
        ])
      }
    />
  );
}
