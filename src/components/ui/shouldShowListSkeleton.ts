/**
 * Có vẽ khung chờ cho một màn danh sách hay không.
 *
 * "Đang gọi API" và "chưa có gì để vẽ" là hai câu hỏi khác nhau, chỉ câu thứ hai
 * quyết định: tải lại khi màn ĐÃ có dữ liệu — mở lại app sau khi dữ liệu cũ, thử
 * lại sau lỗi mạng — phải diễn ra âm thầm, danh sách cũ đứng yên tới lúc có dữ
 * liệu mới. Che danh sách đang đọc bằng khung xám là làm người dùng mất chỗ đang
 * xem, đổi lấy một thông tin họ không cần.
 *
 * Hai trường hợp còn lại đã có chỉ báo riêng nên cũng không vẽ khung chờ: kéo
 * xuống làm mới có vòng xoay của `RefreshControl` ngay chỗ vừa kéo, còn khi tìm
 * kiếm thì giữ danh sách cũ để kết quả thay tại chỗ.
 */
export const shouldShowListSkeleton = ({
  isFetching,
  isEmpty,
  isRefreshing = false,
  isSearching = false,
}: {
  isFetching: boolean;
  /** Chưa có gì để vẽ — điều kiện thật sự của khung chờ. */
  isEmpty: boolean;
  isRefreshing?: boolean;
  isSearching?: boolean;
}) => isFetching && isEmpty && !isRefreshing && !isSearching;
