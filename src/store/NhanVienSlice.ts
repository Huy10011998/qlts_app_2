import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { NhanVienInfo } from "../types/model.d";
import type { NhanVienState } from "../types/redux.d";

const initialState: NhanVienState = {
  info: null,
  status: "idle",
  errorMessage: null,
  accountMissing: false,
};

const nhanVienSlice = createSlice({
  name: "nhanVien",
  initialState,
  reducers: {
    setNhanVienLoading(state) {
      state.status = "loading";
      state.errorMessage = null;
    },
    setNhanVienInfo(state, action: PayloadAction<NhanVienInfo>) {
      state.info = action.payload;
      state.status = "loaded";
      state.errorMessage = null;
      state.accountMissing = false;
    },
    setNhanVienError(state, action: PayloadAction<string>) {
      /* Giữ nguyên `info` cũ: mất mạng giữa chừng thì vẫn còn danh thiếp đã nạp
         để xem, chỉ những ai chưa nạp được lần nào mới thấy màn lỗi. */
      state.status = "error";
      state.errorMessage = action.payload;
    },
    /** Server trả `data: null` — tài khoản đã bị xoá, mời đăng xuất. */
    setNhanVienAccountMissing(state, action: PayloadAction<string>) {
      state.info = null;
      state.status = "error";
      state.errorMessage = action.payload;
      state.accountMissing = true;
    },
    clearNhanVien() {
      return initialState;
    },
  },
});

export const {
  setNhanVienLoading,
  setNhanVienInfo,
  setNhanVienError,
  setNhanVienAccountMissing,
  clearNhanVien,
} = nhanVienSlice.actions;

export default nhanVienSlice.reducer;
