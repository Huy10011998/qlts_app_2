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

/**
 * Danh thiếp nhân viên, nạp MỘT LẦN sau đăng nhập rồi dùng lại.
 *
 * BE khuyến cáo không gọi `get-nhan-vien-info` mỗi lần mở màn: ảnh đại diện và
 * mã QR kèm theo nặng 16-72 KB, mà dữ liệu thì gần như không đổi.
 *
 * `accountMissing` là trường hợp riêng: server trả `data: null` nghĩa là tài
 * khoản đã bị xoá dù token còn hạn — màn nào thấy cờ này thì mời đăng xuất.
 */
export interface NhanVienState {
  info: import("./model.d").NhanVienInfo | null;
  status: "idle" | "loading" | "loaded" | "error";
  /** Câu hiện cho người dùng khi `status` là "error". */
  errorMessage: string | null;
  accountMissing: boolean;
}
