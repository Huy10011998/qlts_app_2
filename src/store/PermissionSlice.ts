import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PermissionState } from "../types/Redux.d";

const initialState: PermissionState = {
  permissions: [],
};

const permissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
    },
    clearPermissions(state) {
      state.permissions = [];
    },
  },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
