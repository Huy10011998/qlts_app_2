import { usePermission } from "../../../hooks/usePermission";
import {
  TRUNG_CHUYEN_NAME_CLASS,
  XAC_NHAN_VI_TRI_NAME_CLASS,
} from "../../../services/data/callApi";

/**
 * Quyền của hai nghiệp vụ tủ lạnh nội địa, gom một chỗ để menu và màn danh sách
 * cùng đọc một nguồn.
 *
 * Xem (`Read`) quyết định có được vào màn lịch sử; thêm (`Insert`) quyết định có
 * nút tạo lượt mới. Tách hai cấp vì có nhân viên chỉ được xem chứ không được
 * ghi. Không có quyền thì ẩn hẳn thao tác, thay vì để bấm rồi ăn 403.
 *
 * `loaded` là false lúc quyền chưa về — màn gọi phải chờ, không thì nháy màn
 * "không có quyền" rồi mới hiện nội dung.
 */
export const useNoiDiaTuLanhPermissions = () => {
  const { can, loaded } = usePermission();

  return {
    loaded,
    canXemXacNhanViTri: can(XAC_NHAN_VI_TRI_NAME_CLASS, "Read"),
    canThemXacNhanViTri: can(XAC_NHAN_VI_TRI_NAME_CLASS, "Insert"),
    canXemTrungChuyen: can(TRUNG_CHUYEN_NAME_CLASS, "Read"),
    canThemTrungChuyen: can(TRUNG_CHUYEN_NAME_CLASS, "Insert"),
  };
};
