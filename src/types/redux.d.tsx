/**
 * Thông báo "đã lưu xong" cho màn đích đọc và hiện dải toast, thay cho Alert
 * phải bấm OK. Mang theo đủ tham số của danh sách con để nút "Xem" trên toast mở
 * được đúng danh sách mà không phải nạp lại gì.
 */
export interface SavedNotice {
  message: string;
  /** Mã bản ghi cha, ví dụ "PC0015". */
  recordLabel?: string;
  nameClass?: string;
  idRoot?: string;
  propertyReference?: string;
  nameClassRoot?: string;
  titleHeader?: string;
}

export interface AssetState {
  shouldRefreshList: boolean; // reload list
  shouldRefreshDetails: boolean; // reload detail

  // item vừa được sửa — AssetList chỉ merge lại item này, giữ nguyên scroll/paging
  updatedListItem: { id: string; nameClass: string } | null;

  /**
   * Đi qua redux chứ không qua nav param: màn đích (máy quét) không nằm trên
   * đường `navigate` trực tiếp — nó được pop về, mà pop thì không truyền params.
   */
  lastSavedNotice: SavedNotice | null;

  selectedTreeValue: string | null;
  selectedTreeProperty: string | null;
  selectedTreeText: string | null;
}

export interface PermissionState {
  permissions: string[];
  loaded: boolean;
}
