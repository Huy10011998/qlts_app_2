import React from "react";
import { SettingRowItem } from "./SettingRowItem";
import { useLogoutFlow } from "./useLogoutFlow";

/** Dòng Đăng xuất cuối màn Cài đặt — hỏi xác nhận rồi mới thoát. */
export default function SettingLogoutRow() {
  const { isLoggingOut, confirmLogout } = useLogoutFlow();

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
      onPress={confirmLogout}
    />
  );
}
