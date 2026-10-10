import { configureStore } from "@reduxjs/toolkit";
import assetReducer from "./AssetSlice";
import nhanVienReducer from "./NhanVienSlice";
import permissionReducer from "./PermissionSlice";
import workflowReducer from "./WorkflowSlice";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    nhanVien: nhanVienReducer,
    permission: permissionReducer,
    workflow: workflowReducer,
  },
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
