export const BASE_URL = "https://api.cholimexfood.com.vn/api";

export const BASE_URL_PDF = "https://api.cholimexfood.com.vn/";

export const PUBLIC_ASSET_BASE_URL = "https://os.cholimexfood.com.vn";

export const API_ENDPOINTS = {
  // ASSET
  GET_MENU_ACTIVE: `${BASE_URL}/Common/get-menu-active`,
  LOGIN: `${BASE_URL}/Authorization/login`,
  REFRESH_TOKEN: `${BASE_URL}/Authorization/refresh-token`,
  GET_INFO: `${BASE_URL}/Common/get-info`,
  CHANGE_PASSWORD: `${BASE_URL}/Authorization/change-password`,
  GET_FIELD_ACTIVE: `${BASE_URL}/Common/get-fields-active`,
  GET_CLASS_BY_NAME: `${BASE_URL}/Common/get-class-by-name`,
  GET_CLASS_REFERENCE: `${BASE_URL}/Common/get-class-reference`,
  PREVIEW_ATTACH_PROPERTY: `${BASE_URL}/Common/preview-attach-property`,
  GET_CATEGORY_ENUM: `${BASE_URL}/Common/get-category-enum`,
  GET_CATEGORY: `${BASE_URL}/Common/get-category`,

  // DASHBOARD TRANG CHỦ — một lượt gọi dựng cả 4 khối số liệu, không tham số.
  GET_DASHBOARD_TAISAN: `${BASE_URL}/Common/get-dashboard-taisan`,
  // Hai card máy móc (cơ cấu theo đơn vị + 12 tháng luỹ kế). Gọi ĐỘC LẬP với
  // endpoint trên: lỗi ở đây chỉ được làm trống hai card đó, không phải cả màn.
  GET_DASHBOARD_MAYMOC: `${BASE_URL}/MayMoc/dashboard`,

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
  // Tất cả đều POST, response chung dạng { message, data }; data == null là
  // thất bại và message đã là câu tiếng Việt viết sẵn cho người dùng đọc.
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

  // NỘI ĐỊA — TỦ LẠNH
  // Hai nhóm dưới đây dùng chung quy ước { message, data }: `data` là kết quả,
  // `message` là câu tiếng Việt viết sẵn cho user. Lỗi 400 → hiện thẳng
  // `message`; lỗi 403 KHÔNG có body (xem `getNoiDiaErrorMessage`).
  XAC_NHAN_VI_TRI_TU_LANH: `${BASE_URL}/XacNhanViTri_TuLanh/xac-nhan`,
  XAC_NHAN_VI_TRI_TU_LANH_LICH_SU: `${BASE_URL}/XacNhanViTri_TuLanh/get-list-lich-su`,
  TRUNG_CHUYEN_TU_LANH_LICH_SU: `${BASE_URL}/TrungChuyen_TuLanh/get-list-lich-su`,
  TRUNG_CHUYEN_TU_LANH_NHA_PHAN_PHOI: `${BASE_URL}/TrungChuyen_TuLanh/get-list-nha-phan-phoi`,
  TRUNG_CHUYEN_TU_LANH_KHACH_HANG: `${BASE_URL}/TrungChuyen_TuLanh/get-list-khach-hang`,
  TRUNG_CHUYEN_TU_LANH: `${BASE_URL}/TrungChuyen_TuLanh/trung-chuyen`,

  // PUSH NOTIFICATION
  // ⚠️ Đường dẫn tạm — BE chưa xong. Sửa lại đúng path rồi bật
  // PUSH_NOTIFICATION_API_READY bên dưới.
  REGISTER_DEVICE_TOKEN: `${BASE_URL}/Notification/register-device`,
  UNREGISTER_DEVICE_TOKEN: `${BASE_URL}/Notification/unregister-device`,
};

/**
 * Công tắc cho phần gọi API đăng ký device token.
 *
 * Đang false vì BE chưa có endpoint: toàn bộ luồng nhận & hiển thị thông báo vẫn
 * chạy đầy đủ (xin quyền, lấy FCM token, hiển thị, bấm để điều hướng), chỉ riêng
 * bước gửi token lên server bị bỏ qua và ghi log. Nhờ vậy app không bị spam lỗi
 * 404 trong lúc chờ BE.
 *
 * Khi BE xong: sửa 2 path ở trên cho đúng rồi đổi cờ này thành true.
 */
export const PUSH_NOTIFICATION_API_READY = false;
