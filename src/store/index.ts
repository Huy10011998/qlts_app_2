import { configureStore } from "@reduxjs/toolkit";
import assetReducer from "./AssetSlice";
import nhanVienReducer from "./NhanVienSlice";
import permissionReducer from "./PermissionSlice";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    nhanVien: nhanVienReducer,
    permission: permissionReducer,
  },
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
