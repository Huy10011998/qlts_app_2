import { configureStore } from "@reduxjs/toolkit";
import assetReducer from "./AssetSlice";
import permissionReducer from "./PermissionSlice";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    permission: permissionReducer,
  },
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
