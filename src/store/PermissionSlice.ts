import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PermissionState } from "../types/Redux.d";

const initialState: PermissionState = {
  permissions: [],
  loaded: false,
};

const permissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
      state.loaded = true;
    },
    clearPermissions(state) {
      state.permissions = [];
      state.loaded = false;
    },
  },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
