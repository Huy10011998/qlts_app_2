export interface AssetState {
  shouldRefreshList: boolean; // reload list
  shouldRefreshDetails: boolean; // reload detail

  selectedTreeValue: string | null;
  selectedTreeProperty: string | null;
  selectedTreeText: string | null;
}

export interface PermissionState {
  permissions: string[];
  loaded: boolean;
}
