import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppDispatch } from "../../store/hooks";
import { loadNhanVienInfo } from "../../store/NhanVienActions";
import { clearNhanVien } from "../../store/NhanVienSlice";
import { BootstrapAuthState } from "./types";

/**
 * Nạp danh thiếp nhân viên đúng MỘT LẦN sau khi đăng nhập xong.
 *
 * BE khuyến cáo cache: dữ liệu gần như không đổi mà ảnh + mã QR kèm theo nặng
 * 16-72 KB, gọi lại mỗi lần mở màn là phí. `loadNhanVienInfo` tự bỏ qua nếu đã
 * nạp rồi, nên effect này chạy lại vài lần cũng không gọi mạng thêm.
 *
 * Đăng xuất thì xoá sạch, không để danh thiếp người trước lọt sang tài khoản
 * sau trên cùng một máy.
 */
export function useNhanVienInfoLoader({
  isAuthenticated,
  authReady,
  iosAuthenticated,
}: BootstrapAuthState) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(clearNhanVien());
      return;
    }

    if (!authReady) return;
    if (Platform.OS === "ios" && !iosAuthenticated) return;

    dispatch(loadNhanVienInfo());
  }, [dispatch, isAuthenticated, authReady, iosAuthenticated]);
}
