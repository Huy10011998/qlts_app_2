import { configureStore } from "@reduxjs/toolkit";
import assetReducer from "./AssetSlice";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
  },
});

// Types
export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
