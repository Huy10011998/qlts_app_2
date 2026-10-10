import { usePermission } from "../../../hooks/usePermission";

/**
 * Quyền theo bảng nghiệp vụ (Class.{name}.Read / Insert / Update / Delete).
 * Luật thật nằm ở server; ở đây chỉ để ẩn thao tác thay vì để bấm rồi ăn 403.
 *
 * `loaded` false lúc quyền chưa về — màn gọi phải chờ, không thì nháy màn
 * "không có quyền" rồi mới hiện nội dung.
 */
export const useWorkflowPermissions = (nameClass?: string | null) => {
  const { can, loaded } = usePermission();
  const name = nameClass ?? "";

  return {
    loaded,
    canRead: !!name && can(name, "Read"),
    canInsert: !!name && can(name, "Insert"),
    canUpdate: !!name && can(name, "Update"),
    canDelete: !!name && can(name, "Delete"),
  };
};
