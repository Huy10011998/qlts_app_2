import { AppDispatch, RootState } from "./index";
import { API_ENDPOINTS } from "../config/index";
import { callApi, isAuthExpiredError } from "../services/data/callApi";
import { isNetworkRequestError } from "../utils/helpers/api";
import type { NhanVienInfo } from "../types/model.d";
import {
  clearNhanVien,
  setNhanVienAccountMissing,
  setNhanVienError,
  setNhanVienInfo,
  setNhanVienLoading,
} from "./NhanVienSlice";
import { error, warn } from "../utils/Logger";

type NhanVienResponse = {
  message?: string;
  data: NhanVienInfo | null;
};

/**
 * Nạp danh thiếp nhân viên vào store.
 *
 * Gọi một lần sau đăng nhập là đủ (xem `useNhanVienInfoLoader`); các màn chỉ
 * đọc lại từ store. `force` dành cho nút thử lại trên màn lỗi.
 */
export const loadNhanVienInfo = (options?: { force?: boolean }) => {
  return async (
    dispatch: AppDispatch,
    getState: () => RootState,
  ): Promise<boolean> => {
    const { status } = getState().nhanVien;

    if (status === "loading") return false;
    if (status === "loaded" && !options?.force) return true;

    dispatch(setNhanVienLoading());

    try {
      const res = await callApi<NhanVienResponse>(
        "POST",
        API_ENDPOINTS.GET_NHAN_VIEN_INFO,
        {},
      );

      /* `data: null` chỉ còn đúng một nghĩa: tài khoản đã bị xoá dù token vẫn
         hợp lệ. Tài khoản chưa gán nhân viên KHÔNG rơi vào đây — nó trả object
         có `ten`, phần còn lại null. */
      if (!res.data) {
        dispatch(
          setNhanVienAccountMissing(
            res.message?.trim() || "Không tìm thấy tài khoản.",
          ),
        );
        return false;
      }

      dispatch(setNhanVienInfo(res.data));
      return true;
    } catch (err) {
      if (isAuthExpiredError(err)) {
        dispatch(clearNhanVien());
        return false;
      }

      if (isNetworkRequestError(err)) {
        warn("Load nhan vien info failed due to network");
      } else {
        error("Load nhan vien info failed", err);
      }

      dispatch(
        setNhanVienError(
          "Vui lòng kiểm tra kết nối mạng hoặc mở lại màn hình này.",
        ),
      );
      return false;
    }
  };
};
