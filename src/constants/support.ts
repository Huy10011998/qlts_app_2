/**
 * Kênh liên hệ IT, dùng ở màn Đăng nhập và ở cuối màn Hướng dẫn sử dụng.
 *
 * Trước đây ba hằng số này nằm cục bộ trong LoginScreen; tách ra đây để hai chỗ
 * không lệch nhau khi công ty đổi số hoặc đổi hộp thư.
 */
export const SUPPORT_EMAIL = "cholimexfood@cholimexfood.com.vn";
export const SUPPORT_PHONE = "028 3765 5037";

/** Số đã bỏ khoảng trắng, dùng cho `tel:`. */
export const SUPPORT_PHONE_LINK = SUPPORT_PHONE.replace(/\s/g, "");
