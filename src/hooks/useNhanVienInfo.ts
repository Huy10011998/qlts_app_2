import { useCallback, useEffect, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useSelector } from "react-redux";

import { useAuth } from "../context/AuthContext";
import type { RootState } from "../store";
import { useAppDispatch } from "../store/hooks";
import { loadNhanVienInfo } from "../store/NhanVienActions";
import { useNetworkAwareReload } from "./useNetworkAwareReload";
import { useSafeAlert } from "./useSafeAlert";

/**
 * Đọc danh thiếp nhân viên đã nạp sẵn trong store.
 *
 * Dữ liệu được nạp một lần ngay sau đăng nhập (`useNhanVienInfoLoader`), nên
 * mở màn KHÔNG gọi API nữa — chỉ gọi lại khi lần nạp đầu hụt (mất mạng lúc
 * đăng nhập) hoặc người dùng chủ động thử lại.
 *
 * Hook cũng lo luôn trường hợp server báo tài khoản đã bị xoá: hiện thông báo
 * rồi cho đăng xuất, đúng một lần cho mỗi lần vào màn.
 */
export function useNhanVienInfo() {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const { showAlertIfActive } = useSafeAlert();
  const { logout } = useAuth();
  const hasAlertedRef = useRef(false);

  const { info, status, errorMessage, accountMissing } = useSelector(
    (state: RootState) => state.nhanVien,
  );

  const reload = useCallback(() => {
    dispatch(loadNhanVienInfo({ force: true }));
  }, [dispatch]);

  /* Lượt nạp lúc đăng nhập hụt (mất mạng) thì thử lại mỗi lần vào màn. Đã có
     dữ liệu rồi thì thôi — `status` chỉ đổi sau một lượt gọi nên effect không
     tự lặp. */
  useEffect(() => {
    if (isFocused && !info && status !== "loading") {
      dispatch(loadNhanVienInfo());
    }
  }, [dispatch, info, isFocused, status]);

  useEffect(() => {
    if (!isFocused || !accountMissing || hasAlertedRef.current) return;

    hasAlertedRef.current = true;
    showAlertIfActive(
      "Thông báo",
      errorMessage || "Không tìm thấy tài khoản. Vui lòng đăng nhập lại.",
      [
        {
          text: "Đăng xuất",
          onPress: () => {
            logout();
          },
        },
      ],
    );
  }, [accountMissing, errorMessage, isFocused, logout, showAlertIfActive]);

  /* Có mạng lại thì thử nạp tiếp, nhưng chỉ khi chưa có gì trong tay — đã nạp
     được rồi thì dữ liệu này gần như không đổi, không cần gọi lại. */
  useNetworkAwareReload(
    () => {
      if (!info) reload();
    },
    { enabled: isFocused, hasError: status === "error" },
  );

  return {
    info,
    /* Chưa có dữ liệu và vẫn đang chờ lượt nạp — màn hiện khung chờ. */
    isLoading: !info && (status === "idle" || status === "loading"),
    errorMessage: status === "error" ? errorMessage : null,
    reload,
  };
}
