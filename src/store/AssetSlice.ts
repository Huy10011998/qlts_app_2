// store/assetSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AssetState } from "../types/Redux.d";

const initialState: AssetState = {
  shouldRefreshList: false,
  shouldRefreshDetails: false,
};

const assetSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    setShouldRefreshList(state, action: PayloadAction<boolean>) {
      state.shouldRefreshList = action.payload;
    },

    resetShouldRefreshList(state) {
      state.shouldRefreshList = false;
    },
    setShouldRefreshDetails(state, action: PayloadAction<boolean>) {
      state.shouldRefreshDetails = action.payload;
    },
    resetShouldRefreshDetails(state) {
      state.shouldRefreshDetails = false;
    },
  },
});

export const {
  setShouldRefreshList,
  resetShouldRefreshList,
  setShouldRefreshDetails,
  resetShouldRefreshDetails,
} = assetSlice.actions;

export default assetSlice.reducer;
