/**
 * Một mục trong menu ⋯ của màn chi tiết.
 *
 * Menu chung không biết gì về nghiệp vụ của từng mục: nguồn cấp (hook) tự quyết
 * nhãn và trạng thái disabled ngay tại chỗ, kể cả khi đang chạy dở một việc dài
 * (ví dụ lấy GPS thì trả `label` = nhãn đang chạy và `disabled` = true).
 */
export type DetailMenuItem = {
  key: string;
  label: string;
  /** Dòng phụ dưới nhãn, ví dụ toạ độ hiện tại của khách hàng. */
  sublabel?: string;
  /** Tên icon Ionicons. */
  icon?: string;
  /** "danger" = chữ đỏ, dành cho mục Xóa. */
  tone?: "default" | "danger";
  disabled?: boolean;
  /**
   * false = bấm xong panel vẫn mở, dùng cho mục chạy tại chỗ và tự báo tiến độ
   * bằng nhãn. Mặc định true: đóng panel rồi mới chạy `onPress`.
   */
  closeOnPress?: boolean;
  onPress: () => void;
};
