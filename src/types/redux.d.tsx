export interface AssetState {
  shouldRefreshList: boolean; // reload list
  shouldRefreshDetails: boolean; // reload detail

  // item vừa được sửa — AssetList chỉ merge lại item này, giữ nguyên scroll/paging
  updatedListItem: { id: string; nameClass: string } | null;

  selectedTreeValue: string | null;
  selectedTreeProperty: string | null;
  selectedTreeText: string | null;
}

export interface PermissionState {
  permissions: string[];
  loaded: boolean;
}
