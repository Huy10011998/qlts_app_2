import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AssetState } from "../types/redux.d";

const initialState: AssetState = {
  shouldRefreshList: false,
  shouldRefreshDetails: false,

  updatedListItem: null,

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

    setUpdatedListItem(
      state,
      action: PayloadAction<{ id: string; nameClass: string }>
    ) {
      state.updatedListItem = action.payload;
    },
    resetUpdatedListItem(state) {
      state.updatedListItem = null;
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
  setUpdatedListItem,
  resetUpdatedListItem,
  setShouldRefreshDetails,
  resetShouldRefreshDetails,
  setSelectedTreeNode,
  resetSelectedTreeNode,
} = assetSlice.actions;

export default assetSlice.reducer;
