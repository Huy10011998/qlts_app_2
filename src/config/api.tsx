export const BASE_URL = "https://api.cholimexfood.com.vn/api";

export const BASE_URL_PDF = "https://api.cholimexfood.com.vn/";

export const PUBLIC_ASSET_BASE_URL = "https://os.cholimexfood.com.vn";

export const API_ENDPOINTS = {
  // ASSET
  GET_MENU_ACTIVE: `${BASE_URL}/Common/get-menu-active`,
  LOGIN: `${BASE_URL}/Authorization/login`,
  REFRESH_TOKEN: `${BASE_URL}/Authorization/refresh-token`,
  GET_INFO: `${BASE_URL}/Common/get-info`,
  /**
   * Danh thiếp của chính người đang đăng nhập — server tự dò nhân viên qua
   * token, app không truyền ID. Trả 200 kèm `data: null` khi tài khoản chưa
   * liên kết nhân viên, lúc đó `message` là câu để hiện thẳng cho người dùng.
   */
  GET_NHAN_VIEN_INFO: `${BASE_URL}/Common/get-nhan-vien-info`,
  CHANGE_PASSWORD: `${BASE_URL}/Authorization/change-password`,
  GET_FIELD_ACTIVE: `${BASE_URL}/Common/get-fields-active`,
  GET_CLASS_BY_NAME: `${BASE_URL}/Common/get-class-by-name`,
  GET_CLASS_REFERENCE: `${BASE_URL}/Common/get-class-reference`,
  PREVIEW_ATTACH_PROPERTY: `${BASE_URL}/Common/preview-attach-property`,
  GET_CATEGORY_ENUM: `${BASE_URL}/Common/get-category-enum`,
  GET_CATEGORY: `${BASE_URL}/Common/get-category`,

  // DASHBOARD TRANG CHỦ — một lượt gọi dựng cả 4 khối số liệu, không tham số.
  GET_DASHBOARD_TAISAN: `${BASE_URL}/Common/get-dashboard-taisan`,
  GET_DASHBOARD_MAYMOC: `${BASE_URL}/MayMoc/dashboard`,
  // Chi tiết điểm danh của MỘT bộ phận — chỉ gọi khi người dùng bấm vào bộ phận,
  // không gọi sẵn lúc mở màn hình (kéo từng dòng nhân viên qua linked server).
  GET_DASHBOARD_TAISAN_DIEMDANH_CHITIET: `${BASE_URL}/Common/get-dashboard-taisan-diemdanh-chitiet`,

  // PERMISSION
  GET_PERMISSION: `${BASE_URL}/Common/get-permission`,

  // CAMERA
  GET_VUNG_CAMERA_STEAM: `${BASE_URL}/VungCamera_ChiTiet/get-vung-camera-steam`,

  // GET TOKEN CAMERA
  GET_TOKEN_VIEW_CAMERA: `${BASE_URL}/Common/get-token-view-camera`,

  // GET ACTIVE DHCD
  GET_ACTIVE_DHCD: `${BASE_URL}/DaiHoiCoDong/get-active-dhcd`,

  // GET CODONG DHCD
  GET_CODONG_DHCD: `${BASE_URL}/DaiHoiCoDong/get-codong-dhcd`,

  // DIEM DANH DHCD
  DIEM_DANH_DHCD: `${BASE_URL}/DaiHoiCoDong_CoDong/diem-danh-dhcd`,
  HUY_DIEM_DANH_DHCD: `${BASE_URL}/DaiHoiCoDong_CoDong/huy-diem-danh-dhcd`,
  LUU_Y_KIEN_CO_DONG_DHCD: `${BASE_URL}/DaiHoiCoDong_CoDong/luu-ykien-codong`,

  // GET VIEW ACTIVE
  GET_VIEW_ACTIVE: `${BASE_URL}/Common/get-view-active`,

  // GET_CONFIG_REPORT
  GET_CONFIG_REPORT: `${BASE_URL}/Common/get-config`,

  // SOLAR DASHBOARD — toàn bộ nhóm này yêu cầu quyền Solar_Dashboard.
  GET_LIST_SOLAR: `${BASE_URL}/TieuThu_Solar/get-list-solar`,
  SOLAR_POWER_FLOW: `${BASE_URL}/TieuThu_Solar/dashboard-power-flow`,
  SOLAR_OVERVIEW: `${BASE_URL}/TieuThu_Solar/dashboard-overview`,
  SOLAR_ENERGY_DETAILS: `${BASE_URL}/TieuThu_Solar/dashboard-energy-details`,
  SOLAR_POWER_DETAILS: `${BASE_URL}/TieuThu_Solar/dashboard-power-details`,
  SOLAR_ENERGY: `${BASE_URL}/TieuThu_Solar/dashboard-energy`,
  SOLAR_ENV_BENEFITS: `${BASE_URL}/TieuThu_Solar/dashboard-env-benefits`,

  // GET PHUONG TIEN
  GET_PHUONG_TIEN: `${BASE_URL}/PhuongTien/get-list`,
  GET_PHUONG_TIEN_HANH_TRINH: `${BASE_URL}/PhuongTien_HanhTrinh/get-list`,
  GET_PHUONG_TIEN_HANH_TRINH_GPS: `${BASE_URL}/PhuongTien_HanhTrinh_GPS/get-list`,
  GET_PHUONG_TIEN_TRACKING: `${BASE_URL}/PhuongTien_Tracking/get-list`,
  GET_PHUONG_TIEN_CURRENT_LOCATION: `${BASE_URL}/PhuongTien/vi-tri-hien-tai`,

  // NỘI ĐỊA
  XAC_NHAN_VI_TRI_TU_LANH: `${BASE_URL}/XacNhanViTri_TuLanh/xac-nhan`,
  XAC_NHAN_VI_TRI_TU_LANH_LICH_SU: `${BASE_URL}/XacNhanViTri_TuLanh/get-list-lich-su`,
  TRUNG_CHUYEN_TU_LANH_LICH_SU: `${BASE_URL}/TrungChuyen_TuLanh/get-list-lich-su`,
  TRUNG_CHUYEN_TU_LANH_NHA_PHAN_PHOI: `${BASE_URL}/TrungChuyen_TuLanh/get-list-nha-phan-phoi`,
  TRUNG_CHUYEN_TU_LANH_KHACH_HANG: `${BASE_URL}/TrungChuyen_TuLanh/get-list-khach-hang`,
  TRUNG_CHUYEN_TU_LANH: `${BASE_URL}/TrungChuyen_TuLanh/trung-chuyen`,
  NOI_DIA_KHACH_HANG_CAP_NHAT_TOA_DO: `${BASE_URL}/NoiDia_KhachHang/cap-nhat-toa-do`,

  // PUSH NOTIFICATION — map FCM token ↔ user đang đăng nhập.
  // Server tự lấy ID_User từ access token, app chỉ gửi token + platform.
  UPDATE_FCM_TOKEN: `${BASE_URL}/Common/update-fcm-token`,
  LOGOUT_FCM_TOKEN: `${BASE_URL}/Common/logout-fcm-token`,

  // NOTI CAMERA — tạm dừng thông báo AI phát hiện sự kiện.
  // Cả 3 API yêu cầu quyền Class.Camera.NotiCameraMobile, thiếu quyền trả 403.
  CAMERA_NOTI_TAM_DUNG: `${BASE_URL}/Camera/noti-tam-dung`,
  CAMERA_NOTI_TRANG_THAI: `${BASE_URL}/Camera/noti-trang-thai`,
  CAMERA_NOTI_HUY_TAM_DUNG: `${BASE_URL}/Camera/noti-huy-tam-dung`,

  // WORKFLOW — PHIẾU ĐỀ NGHỊ. Các API còn lại nằm dưới `/{TenBang}/flow-*`,
  // đường dẫn dựng theo tên bảng trong `services/data/flowApi.ts`.
  GET_FLOW_FIELDS: `${BASE_URL}/Common/get-flow-fields`,

  // WORKFLOW — CÔNG VIỆC. CRUD generic (get-list, insert, update...) của bảng
  // này bị server chặn — chỉ gọi các API cv-* dưới đây.
  CV_GET_LIST: `${BASE_URL}/CV_CongViec/cv-get-list`,
  CV_DEM_TAB: `${BASE_URL}/CV_CongViec/cv-dem-tab`,
  CV_THONG_TIN: `${BASE_URL}/CV_CongViec/cv-thong-tin`,
  CV_CHI_TIET: `${BASE_URL}/CV_CongViec/cv-chi-tiet`,
  CV_NHAN_VIEN: `${BASE_URL}/CV_CongViec/cv-nhan-vien`,
  CV_THEM: `${BASE_URL}/CV_CongViec/cv-them`,
  CV_SUA: `${BASE_URL}/CV_CongViec/cv-sua`,
  CV_CHUYEN_TRANG_THAI: `${BASE_URL}/CV_CongViec/cv-chuyen-trang-thai`,
  CV_TAI_FILE_LICH_SU: `${BASE_URL}/CV_CongViec/cv-tai-file-lich-su`,
  CV_GIA_HAN: `${BASE_URL}/CV_CongViec/cv-gia-han`,
  CV_DOI_CHU_TRI: `${BASE_URL}/CV_CongViec/cv-doi-chu-tri`,
  CV_LICH_SU: `${BASE_URL}/CV_CongViec/cv-lich-su`,
  CV_DELETE: `${BASE_URL}/CV_CongViec/delete`,
  // Thông báo của view Workflow (công việc + phiếu chờ duyệt), mới → cũ.
  CV_THONG_BAO: `${BASE_URL}/CV_CongViec/cv-thong-bao`,

  // WORKFLOW — KẾ HOẠCH. CRUD generic cũng bị chặn.
  KH_GET_LIST: `${BASE_URL}/CV_KeHoach/kh-get-list`,
  KH_CHI_TIET: `${BASE_URL}/CV_KeHoach/kh-chi-tiet`,
  KH_THEM: `${BASE_URL}/CV_KeHoach/kh-them`,
  KH_SUA: `${BASE_URL}/CV_KeHoach/kh-sua`,
  KH_XOA: `${BASE_URL}/CV_KeHoach/kh-xoa`,
};

export const PUSH_NOTIFICATION_API_READY = true;
