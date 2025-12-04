import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AssetState } from "../types/Redux.d";

const initialState: AssetState = {
  shouldRefreshList: false,
  shouldRefreshDetails: false,

  selectedTreeValue: null,
  selectedTreeProperty: null,
  selectedTreeText: null,
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

    // Lưu node được chọn vào redux
    setSelectedTreeNode(
      state,
      action: PayloadAction<{
        value: string | null;
        property: string | null;
        text: string | null;
      }>
    ) {
      state.selectedTreeValue = action.payload.value;
      state.selectedTreeProperty = action.payload.property;
      state.selectedTreeText = action.payload.text;
    },

    resetSelectedTreeNode(state) {
      state.selectedTreeValue = null;
      state.selectedTreeProperty = null;
      state.selectedTreeText = null;
    },
  },
});

export const {
  setShouldRefreshList,
  resetShouldRefreshList,
  setShouldRefreshDetails,
  resetShouldRefreshDetails,
  setSelectedTreeNode,
  resetSelectedTreeNode,
} = assetSlice.actions;

export default assetSlice.reducer;
